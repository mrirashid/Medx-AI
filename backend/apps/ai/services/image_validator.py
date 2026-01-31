"""
Medical Image Validator Service - Exact copy of model_safety.py from Streamlit app

Validates that uploaded images appear to be legitimate medical images
(e.g., histopathology slides, HER2 tissue samples) rather than random images.

This is a direct port of the working implementation from Her2/model_safety.py
"""

import os
import cv2
import numpy as np
from PIL import Image
import logging
import joblib

logger = logging.getLogger(__name__)


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
    upper_tissue = np.array([180, 255, 230])  # Exclude very bright whites
    
    mask = cv2.inRange(hsv, lower_tissue, upper_tissue)
    tissue_pixels = cv2.countNonZero(mask)
    
    if tissue_pixels < 100:  # Arbitrary small number
        return True, "No tissue detected (color profile)"

    # Reject if Saturation is wildly abnormal (e.g. grayscale image uploaded as RGB)
    sat_mean = np.mean(hsv[:, :, 1])
    if sat_mean < 5.0:
        return True, "Image is grayscale/monochrome"
        
    return False, None


# Load references if available
REF_HIST_PATH = os.path.join(os.path.dirname(__file__), '..', 'ml_models', 'reference_histograms.pkl')
REFERENCE_HISTOGRAMS = None
if os.path.exists(REF_HIST_PATH):
    try:
        REFERENCE_HISTOGRAMS = joblib.load(REF_HIST_PATH)
        logger.info(f"Loaded {len(REFERENCE_HISTOGRAMS)} reference histograms for OOD detection")
    except Exception as e:
        logger.warning(f"Failed to load reference histograms: {e}")


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
        return False, None  # Feature disabled if no refs
        
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
    s_verify = (hsv[:, :, 1] > 30)
    v_verify = (hsv[:, :, 2] < 235)
    valid_color_mask = s_verify & v_verify
    
    h = hsv[:, :, 0]
    
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


class MedicalImageValidator:
    """
    Validates medical images for HER2 prediction.
    
    Uses the exact same safety checks as model_safety.py from the Streamlit app:
    1. Whitespace check - reject mostly white images
    2. Blur check - reject blurry images
    3. Stain profile check - verify H&E/DAB staining colors
    4. Histogram similarity - detect out-of-distribution images
    """
    
    # Default configuration matching model_safety.py exactly
    DEFAULT_CONFIG = {
        'whitespace_thresh': 0.95,
        'blur_thresh': 20.0,        # Adjusted based on user feedback in streamlit
        'stain_thresh': 0.02,       # 15% of image must be H&E/DAB
        'hist_thresh': 0.5,         # Histogram correlation threshold
        'entropy_thresh': 2.5,      # High entropy = low confidence
    }
    
    # Minimum dimensions for medical images
    MIN_WIDTH = 100
    MIN_HEIGHT = 100
    MAX_WIDTH = 100000
    MAX_HEIGHT = 100000
    
    def __init__(self, config: dict = None):
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
    
    def validate(self, image_path: str, config: dict = None) -> dict:
        """
        Validate if the image appears to be a medical/histopathology image.
        
        Args:
            image_path: Path to the image file
            config: Optional config overrides
            
        Returns:
            dict with:
                - is_valid: bool
                - status: 'valid', 'rejected', or 'warning'
                - reason: str (if rejected/warning)
                - confidence: float (0-1)
                - checks: dict with individual check results
        """
        cfg = {**self.config, **(config or {})}
        checks = {}
        
        try:
            pil_img = Image.open(image_path).convert('RGB')
            cv_img = load_image_opencv(pil_img)
            width, height = pil_img.size
            
            # 1. Dimension check
            if width < self.MIN_WIDTH or height < self.MIN_HEIGHT:
                return {
                    'is_valid': False,
                    'status': 'rejected',
                    'reason': f"Image too small ({width}x{height}). Minimum: {self.MIN_WIDTH}x{self.MIN_HEIGHT}",
                    'confidence': 0.0,
                    'checks': checks
                }
            if width > self.MAX_WIDTH or height > self.MAX_HEIGHT:
                return {
                    'is_valid': False,
                    'status': 'rejected',
                    'reason': f"Image too large ({width}x{height}). Maximum: {self.MAX_WIDTH}x{self.MAX_HEIGHT}",
                    'confidence': 0.0,
                    'checks': checks
                }
            checks['dimensions'] = {'passed': True, 'value': f"{width}x{height}"}
            
            # 2. Whitespace check
            is_ws, ws_reason = check_whitespace(cv_img, threshold=cfg['whitespace_thresh'])
            checks['whitespace'] = {'passed': not is_ws, 'reason': ws_reason}
            if is_ws:
                return {
                    'is_valid': False,
                    'status': 'rejected',
                    'reason': ws_reason,
                    'confidence': 0.0,
                    'checks': checks
                }
            
            # 3. Blur check
            is_blur, blur_reason = check_blur(cv_img, threshold=cfg['blur_thresh'])
            checks['blur'] = {'passed': not is_blur, 'reason': blur_reason}
            if is_blur:
                return {
                    'is_valid': False,
                    'status': 'rejected',
                    'reason': blur_reason,
                    'confidence': 0.0,
                    'checks': checks
                }
            
            # 4. Stain profile check (H&E / DAB)
            is_bad_stain, stain_reason = check_stain_profile(cv_img, min_stain_coverage=cfg['stain_thresh'])
            checks['stain_profile'] = {'passed': not is_bad_stain, 'reason': stain_reason}
            if is_bad_stain:
                return {
                    'is_valid': False,
                    'status': 'rejected',
                    'reason': stain_reason,
                    'confidence': 0.0,
                    'checks': checks
                }
            
            # 5. Histogram similarity check (OOD detection)
            is_ood, ood_reason = check_histogram_similarity(cv_img, threshold=cfg['hist_thresh'])
            checks['histogram_similarity'] = {'passed': not is_ood, 'reason': ood_reason}
            if is_ood:
                return {
                    'is_valid': False,
                    'status': 'rejected',
                    'reason': ood_reason,
                    'confidence': 0.0,
                    'checks': checks
                }
            
            # All checks passed
            return {
                'is_valid': True,
                'status': 'valid',
                'reason': None,
                'confidence': 1.0,
                'checks': checks
            }
            
        except Exception as e:
            logger.error(f"Image validation failed: {str(e)}")
            return {
                'is_valid': False,
                'status': 'rejected',
                'reason': f"Failed to process image: {str(e)}",
                'confidence': 0.0,
                'checks': checks
            }
    
    def validate_pil_image(self, pil_img: Image.Image, config: dict = None) -> dict:
        """
        Validate a PIL image directly (without file path).
        
        Args:
            pil_img: PIL Image object
            config: Optional config overrides
            
        Returns:
            Same format as validate()
        """
        cfg = {**self.config, **(config or {})}
        checks = {}
        
        try:
            cv_img = load_image_opencv(pil_img)
            width, height = pil_img.size
            
            # 1. Dimension check
            if width < self.MIN_WIDTH or height < self.MIN_HEIGHT:
                return {
                    'is_valid': False,
                    'status': 'rejected',
                    'reason': f"Image too small ({width}x{height})",
                    'confidence': 0.0,
                    'checks': checks
                }
            checks['dimensions'] = {'passed': True, 'value': f"{width}x{height}"}
            
            # 2. Whitespace check
            is_ws, ws_reason = check_whitespace(cv_img, threshold=cfg['whitespace_thresh'])
            checks['whitespace'] = {'passed': not is_ws, 'reason': ws_reason}
            if is_ws:
                return {
                    'is_valid': False,
                    'status': 'rejected',
                    'reason': ws_reason,
                    'confidence': 0.0,
                    'checks': checks
                }
            
            # 3. Blur check
            is_blur, blur_reason = check_blur(cv_img, threshold=cfg['blur_thresh'])
            checks['blur'] = {'passed': not is_blur, 'reason': blur_reason}
            if is_blur:
                return {
                    'is_valid': False,
                    'status': 'rejected',
                    'reason': blur_reason,
                    'confidence': 0.0,
                    'checks': checks
                }
            
            # 4. Stain profile check
            is_bad_stain, stain_reason = check_stain_profile(cv_img, min_stain_coverage=cfg['stain_thresh'])
            checks['stain_profile'] = {'passed': not is_bad_stain, 'reason': stain_reason}
            if is_bad_stain:
                return {
                    'is_valid': False,
                    'status': 'rejected',
                    'reason': stain_reason,
                    'confidence': 0.0,
                    'checks': checks
                }
            
            # 5. Histogram similarity check
            is_ood, ood_reason = check_histogram_similarity(cv_img, threshold=cfg['hist_thresh'])
            checks['histogram_similarity'] = {'passed': not is_ood, 'reason': ood_reason}
            if is_ood:
                return {
                    'is_valid': False,
                    'status': 'rejected',
                    'reason': ood_reason,
                    'confidence': 0.0,
                    'checks': checks
                }
            
            return {
                'is_valid': True,
                'status': 'valid',
                'reason': None,
                'confidence': 1.0,
                'checks': checks
            }
            
        except Exception as e:
            logger.error(f"Image validation failed: {str(e)}")
            return {
                'is_valid': False,
                'status': 'rejected',
                'reason': f"Failed to process image: {str(e)}",
                'confidence': 0.0,
                'checks': checks
            }


# Singleton instance
image_validator = MedicalImageValidator()
