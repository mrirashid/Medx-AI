import cv2
import numpy as np
import io
from PIL import Image

def load_image_opencv(pil_img):
    """Convert PIL image to OpenCV format (BGR)."""
    return cv2.cvtColor(np.array(pil_img.convert('RGB')), cv2.COLOR_RGB2BGR)

def check_whitespace(cv_img, threshold=0.85, white_pixel_val=220):
    """
    Reject image if it is mostly whitespace.
    
    Args:
        cv_img: OpenCV image (BGR).
        threshold: Fraction of pixels that must be 'white' to reject (e.g., 0.85 = 85%).
        white_pixel_val: Grayscale value above which a pixel is considered 'white' (0-255).
        
    Returns:
        (is_rejected, reason_string)
    """
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    # Count pixels that are "white" (background)
    white_pixels = np.sum(gray > white_pixel_val)
    total_pixels = gray.size
    ratio = white_pixels / total_pixels
    
    if ratio > threshold:
        return True, f"Too much whitespace ({ratio:.1%} > {threshold:.0%})"
    return False, None

def check_blur(cv_img, threshold=100.0):
    """
    Reject image if it is too blurry using Laplacian variance.
    
    Args:
        cv_img: OpenCV image (BGR).
        threshold: Variance threshold. Lower means more tolerant of blur, Higher requires sharper images.
                   Typical values: 50-150 depending on zoom/resolution.
                   
    Returns:
        (is_rejected, reason_string)
    """
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    if variance < threshold:
        return True, f"Image is blurry (Score: {variance:.1f} < {threshold})"
    return False, None

def check_color_profile(cv_img):
    """
    Heuristic check for H&E / IHC (DAB) staining.
    Expected: Multi-modal color distribution typically containing:
    - Hematoxylin (dark blue/purple) for nuclei
    - DAB (brown) for HER2 positive
    - Eosin/Background (pinkish-white)
    
    We convert to HSV and check if we have sufficient signal in non-white/gray areas.
    """
    hsv = cv2.cvtColor(cv_img, cv2.COLOR_BGR2HSV)
    
    # 1. Check saturation: Pathology slides should have color (saturation), not be grayscale.
    # Ignore background checks handled by check_whitespace.
    # Calculate mean saturation of non-white pixels
    
    # Mask out bright background (Value > 220, Saturation < 30)
    # This is a rough mask for "tissue"
    lower_tissue = np.array([0, 20, 0])
    upper_tissue = np.array([180, 255, 230]) # Exclude very bright whites
    
    mask = cv2.inRange(hsv, lower_tissue, upper_tissue)
    tissue_pixels = cv2.countNonZero(mask)
    
    if tissue_pixels < 100: # Arbitrary small number
         return True, "No tissue detected (color profile)"

    # We can check specific hue ranges if needed, but simple "is there biological stain color" 
    # is usually enough to reject random photos of cats/cars which look very different in histogram.
    # A stricter check: Valid IHC is Blue (Nuclei) and Brown (DAB).
    # Blue: Hue ~100-130 (in OpenCV 0-180 scale?) -> OpenCV H is 0-179. Blue is ~120.
    # Brown: Hue ~10-20.
    
    # Let's verify if the image has *some* plausible pathology colors.
    # This is hard to robustly tune without a dataset, so we keep it permissive safely:
    # Reject if Saturation is wildly abnormal (e.g. grayscale image uploaded as RGB)
    sat_mean = np.mean(hsv[:,:,1])
    if sat_mean < 5.0:
        return True, "Image is grayscale/monochrome"
        
    return False, None

import joblib
import os

# Load references if available
REF_HIST_PATH = os.path.join(os.path.dirname(__file__), 'reference_histograms.pkl')
REFERENCE_HISTOGRAMS = None
if os.path.exists(REF_HIST_PATH):
    try:
        REFERENCE_HISTOGRAMS = joblib.load(REF_HIST_PATH)
    except Exception as e:
        print(f"Warning: Failed to load reference histograms: {e}")

def compute_histogram(cv_img):
    """Compute normalized 3D HSV histogram matching build_reference.py."""
    hsv = cv2.cvtColor(cv_img, cv2.COLOR_BGR2HSV)
    # 30x32x32 bins
    hist = cv2.calcHist([hsv], [0, 1, 2], None, [30, 32, 32], [0, 180, 0, 256, 0, 256])
    cv2.normalize(hist, hist)
    return hist.flatten()

def check_histogram_similarity(cv_img, threshold=0.5):
    """
    Compare image histogram to reference histograms using Correlation.
    Returns: (Rejected (bool), Reason (str))
    """
    if REFERENCE_HISTOGRAMS is None or len(REFERENCE_HISTOGRAMS) == 0:
        return False, None # Feature disabled if no refs
        
    target_hist = compute_histogram(cv_img)
    max_score = -1.0
    
    for ref_hist in REFERENCE_HISTOGRAMS:
        score = cv2.compareHist(target_hist, ref_hist, cv2.HISTCMP_CORREL)
        if score > max_score:
            max_score = score
            
    if max_score < threshold:
        return True, f"Image content does not match training data (Similarity: {max_score:.2f} < {threshold})"
        
    return False, None

def check_stain_profile(cv_img, min_stain_coverage=0.15):
    """
    Stricter check for H&E / DAB staining.
    Verifies that a significant portion of the image contains:
    - Hematoxylin (Purple/Blue): H [110, 170]
    - DAB (Brown): H [0, 25] or [160, 180]
    
    Args:
        cv_img: BGR Image
        min_stain_coverage: Minimum fraction of total pixels that must match stain colors.
    """
    hsv = cv2.cvtColor(cv_img, cv2.COLOR_BGR2HSV)
    
    # Define thresholds
    # S > 30 (must have color), V < 230 (not white background)
    s_verify = (hsv[:,:,1] > 30)
    v_verify = (hsv[:,:,2] < 235)
    valid_color_mask = s_verify & v_verify
    
    h = hsv[:,:,0]
    
    # Hematoxylin: Blue/Purple (approx 100-170 in OpenCV)
    # Ref: Blue=120, Purple=150.
    mask_hema = (h > 100) & (h < 170)
    
    # DAB: Brown (Red-Orange). Approx 0-25 and 160-180
    mask_dab = (h < 25) | (h > 160)
    
    # Combine: Must have valid saturation/value AND be in hue range
    stain_pixels = valid_color_mask & (mask_hema | mask_dab)
    
    count_stain = np.sum(stain_pixels)
    total_pixels = hsv.shape[0] * hsv.shape[1]
    
    ratio = count_stain / total_pixels
    
    if ratio < min_stain_coverage:
        return True, f"No stain detected (Coverage: {ratio:.1%} < {min_stain_coverage:.0%})"
        
    return False, None

def calculate_entropy(probs):
    """Compute Shannon entropy of the probability distribution."""
    # Add epsilon to avoid log(0)
    probs = np.array(probs)
    epsilon = 1e-10
    entropy = -np.sum(probs * np.log(probs + epsilon))
    return entropy

def safe_predict(pil_img, model_data, config=None):
    """
    Wrapper pipeline to run safety checks before prediction.
    
    Args:
        pil_img: PIL Image object.
        model_data: Dict containing 'model', 'scaler', 'class_names'.
        config: Dict for thresholds (optional).
    
    Returns:
        dict: {
            "status": "Success" | "Rejected",
            "reason": str (if rejected),
            "prediction": str (class name),
            "confidence": float,
            "entropy": float,
            "probabilities": list
        }
    """
    if config is None:
        config = {
            'whitespace_thresh': 0.85,
            'blur_thresh': 25.0, # Adjusted based on user feedback
            'entropy_thresh': 2.5, # High entropy = low confidence
            'stain_thresh': 0.15   # 15% of image must be H&E/DAB
        }
        
    cv_img = load_image_opencv(pil_img)
    
    # 1. Whitespace Check
    is_ws, ws_reason = check_whitespace(cv_img, threshold=config.get('whitespace_thresh', 0.85))
    if is_ws:
        return {"status": "Rejected", "reason": ws_reason}
        
    # 2. Blur Check
    is_blur, blur_reason = check_blur(cv_img, threshold=config.get('blur_thresh', 50.0))
    if is_blur:
        return {"status": "Rejected", "reason": blur_reason}
        
    # 3. Color Profile (Strict Stain Check)
    # We use the new strict check for Hematoxylin & DAB
    stain_thresh = config.get('stain_thresh', 0.15)
    is_bad_color, color_reason = check_stain_profile(cv_img, min_stain_coverage=stain_thresh)
    if is_bad_color:
        return {"status": "Rejected", "reason": color_reason}

    # 4. Histogram Similarity Check (OOD)
    hist_thresh = config.get('hist_thresh', 0.5)
    is_ood, ood_reason = check_histogram_similarity(cv_img, threshold=hist_thresh)
    if is_ood:
        return {"status": "Rejected", "reason": ood_reason}

    # 5. Prediction
    # Import locally to avoid circular dependency if moved, though passing model_data works.
    # We duplicate feature extraction here for robustness as 'extract_features_from_image_pil' is in streamlit_app.
    # To keep it clean, we should import it if possible, but streamlit_app is a script.
    # I will rely on the caller to pass a prediction function or just duplicate feature extraction logic 
    # since it's small and safer than importing a streamlit script.
    
    model = model_data['model']
    scaler = model_data['scaler']
    class_names = model_data['class_names']
    
    img_array = np.array(pil_img.convert('RGB'))
    features = []
    # Color statistics
    for channel in range(3):
        channel_data = img_array[:, :, channel]
        features.extend([
            np.mean(channel_data),
            np.std(channel_data),
            np.median(channel_data),
            np.percentile(channel_data, 25),
            np.percentile(channel_data, 75),
        ])
    # Texture features
    gray_img = np.mean(img_array, axis=2)
    features.extend([
        np.mean(gray_img),
        np.std(gray_img),
        np.mean(np.abs(np.gradient(gray_img)[0])),
        np.mean(np.abs(np.gradient(gray_img)[1])),
    ])
    feats_arr = np.array(features)
    
    feats_scaled = scaler.transform(feats_arr.reshape(1, -1))
    probs = model.predict_proba(feats_scaled)[0]
    pred_idx = int(np.argmax(probs))
    pred_label = class_names[pred_idx]
    confidence = float(np.max(probs))
    
    # 5. Entropy Check
    entropy = calculate_entropy(probs)
    entropy_thresh = config.get('entropy_thresh', 1.0) 
    
    if entropy > entropy_thresh:
        return {
            "status": "Unknown",
            "reason": f"High Uncertainty (Entropy: {entropy:.2f} > {entropy_thresh})",
            "probabilities": probs.tolist(), 
            "entropy": entropy
        }
        
    return {
        "status": "Success",
        "prediction": pred_label,
        "confidence": confidence,
        "entropy": entropy,
        "probabilities": probs.tolist(),
        "features": feats_arr.tolist()
    }
