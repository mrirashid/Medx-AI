import cv2
import numpy as np
import joblib
import os
from PIL import Image

# Paths to the uploaded reference images
images = {
    "Class 0": r"C:/Users/User/.gemini/antigravity/brain/28710e58-fdc2-45f0-8d11-c8588561092a/uploaded_image_0_1766003215916.jpg",
    "Class 1": r"C:/Users/User/.gemini/antigravity/brain/28710e58-fdc2-45f0-8d11-c8588561092a/uploaded_image_1_1766003215916.jpg",
    "Class 2": r"C:/Users/User/.gemini/antigravity/brain/28710e58-fdc2-45f0-8d11-c8588561092a/uploaded_image_2_1766003215916.jpg",
    "Class 3": r"C:/Users/User/.gemini/antigravity/brain/28710e58-fdc2-45f0-8d11-c8588561092a/uploaded_image_3_1766003215916.jpg"
}

OUTPUT_FILE = "reference_histograms.pkl"

def compute_histogram(cv_img):
    """Compute normalized 3D HSV histogram."""
    hsv = cv2.cvtColor(cv_img, cv2.COLOR_BGR2HSV)
    # 50 bins for Hue, 60 for Saturation, 60 for Value seems reasonable for detail
    # or smaller 8x8x8 for robustness? Staining is specific, let's use 30x32x32.
    # Hue is 0-180 in OpenCV.
    hist = cv2.calcHist([hsv], [0, 1, 2], None, [30, 32, 32], [0, 180, 0, 256, 0, 256])
    cv2.normalize(hist, hist)
    return hist.flatten()

histograms = []
print("Building reference histograms...")

for label, path in images.items():
    if os.path.exists(path):
        print(f"Processing {label}...")
        try:
            pil_img = Image.open(path)
            # Convert to cv2 BGR
            cv_img = cv2.cvtColor(np.array(pil_img.convert('RGB')), cv2.COLOR_RGB2BGR)
            hist = compute_histogram(cv_img)
            histograms.append(hist)
            print("  > Done.")
        except Exception as e:
            print(f"  > Failed: {e}")
    else:
        print(f"Skipping {label} (File not found)")

if len(histograms) > 0:
    print(f"Saving {len(histograms)} histograms to {OUTPUT_FILE}...")
    joblib.dump(histograms, OUTPUT_FILE)
    print("Success!")
else:
    print("Error: No histograms generated.")
