import joblib
import sys
import traceback
import sklearn
print(f"Python executable: {sys.executable}")
print(f"Sklearn version: {sklearn.__version__}")
print(f"Joblib version: {joblib.__version__}")

try:
    print("Attempting to load model...")
    model = joblib.load('deployable_breast_cancer_model.joblib')
    print("Model loaded successfully!")
except Exception:
    print("Failed to load model.")
    traceback.print_exc()
