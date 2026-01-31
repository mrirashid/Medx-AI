"""
HER2 Predictor Service - Fixed version matching streamlit_app.py implementation
"""

import os
import numpy as np
import joblib
from PIL import Image
from django.conf import settings
import traceback
import logging

logger = logging.getLogger(__name__)


class SimpleFeatureExtractor:
    """
    Simple feature extractor matching the training notebook EXACTLY.
    The model was trained with SimpleBreastCancerModel which extracts 19 features.
    """
    
    def extract_features_from_image(self, image_path):
        """
        Extract simple features from image - MUST match training exactly!
        
        This matches SimpleBreastCancerModel.extract_features_from_patch() from the notebook:
        - 5 stats per color channel (3 channels × 5 = 15 features)
        - 4 grayscale/texture features
        Total: 19 features
        """
        try:
            with Image.open(image_path) as img:
                img = img.convert('RGB')
                img_array = np.array(img)
                
                features = []
                
                # Color statistics for each channel (EXACTLY as in training)
                for channel in range(3):
                    channel_data = img_array[:, :, channel]
                    features.extend([
                        np.mean(channel_data),
                        np.std(channel_data),
                        np.median(channel_data),
                        np.percentile(channel_data, 25),
                        np.percentile(channel_data, 75),
                    ])
                
                # Texture features (simple gradients) - EXACTLY as in training
                gray_img = np.mean(img_array, axis=2)
                features.extend([
                    np.mean(gray_img),
                    np.std(gray_img),
                    # Simple texture measures
                    np.mean(np.abs(np.gradient(gray_img)[0])),  # Horizontal variation
                    np.mean(np.abs(np.gradient(gray_img)[1])),  # Vertical variation
                ])
                
                logger.info(f"Extracted {len(features)} features from image")
                return np.array(features)
                
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            raise

    def extract_features_from_pil(self, pil_img: Image.Image) -> np.ndarray:
        """
        Extract features from PIL image directly (for validation pipeline).
        """
        img_array = np.array(pil_img.convert('RGB'))
        features = []
        
        # Color statistics for each channel
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
        
        return np.array(features)


class HER2Predictor:
    """HER2 status prediction service with lazy loading"""
    
    # Class mapping (matching training notebook)
    HER2_CLASSES = {
        0: 'HER2_0',
        1: 'HER2_1+',
        2: 'HER2_2+',
        3: 'HER2_3+'
    }
    
    # Risk levels based on HER2 status
    RISK_LEVELS = {
        'HER2_0': 'low',
        'HER2_1+': 'medium',
        'HER2_2+': 'high',
        'HER2_3+': 'critical'
    }
    
    # Base risk scores for each class (before adjusting with confidence)
    # These represent the clinical significance of each HER2 status
    BASE_RISK_SCORES = {
        'HER2_0': 15,     # Low risk - HER2 negative
        'HER2_1+': 35,    # Low-medium risk - HER2 low positive
        'HER2_2+': 65,    # High risk - HER2 moderate positive (needs FISH testing)
        'HER2_3+': 90,    # Critical risk - HER2 high positive (needs treatment)
    }
    
    def __init__(self):
        """Initialize predictor (model loaded on first predict call)"""
        self._model_data = None
        self._ensemble = None
        self._scaler = None
        self._feature_extractor = SimpleFeatureExtractor()


    def _load_model(self):
        """Load the trained model (lazy loading)"""
        if self._model_data is not None:
            return

        # Try multiple possible model paths
        possible_paths = [
            os.path.join(settings.BASE_DIR, 'apps/ai/ml_models/advanced_breast_cancer_model.joblib'),
        ]
        
        model_path = None
        for path in possible_paths:
            if os.path.exists(path):
                model_path = path
                break
        
        if model_path is None:
            raise FileNotFoundError(
                f"Model file not found. Please place the model file in one of these locations: {possible_paths}"
            )

        try:
            logger.info(f"Loading HER2 model from {model_path}")
            self._model_data = joblib.load(model_path)
            
            # Load model components
            self._ensemble = self._model_data['model']
            self._scaler = self._model_data['scaler']
            
            # Get class names from model if available
            if 'class_names' in self._model_data:
                self._class_names = self._model_data['class_names']
            else:
                self._class_names = list(self.HER2_CLASSES.values())
            
            logger.info("HER2 prediction model loaded successfully")
            logger.info(f"Scaler expects {self._scaler.n_features_in_} features")
            logger.info(f"Model classes: {self._class_names}")
            
        except KeyError as e:
            logger.error(f"Model file missing expected key: {e}")
            logger.error(f"Available keys: {list(self._model_data.keys()) if self._model_data else 'None'}")
            raise RuntimeError(
                f"Model file is corrupted or incompatible. Missing key: {e}. "
                "Please retrain and save the model with correct structure."
            )
        except Exception as e:
            logger.error(f"Failed to load HER2 model: {str(e)}")
            logger.error(traceback.format_exc())
            raise RuntimeError(f"Failed to load HER2 model: {str(e)}")

    
    @property
    def ensemble(self):
        """Access ensemble model (triggers lazy load)"""
        self._load_model()
        return self._ensemble
    
    @property
    def scaler(self):
        """Access scaler (triggers lazy load)"""
        self._load_model()
        return self._scaler
    
    @property
    def model_data(self):
        """Access full model data (triggers lazy load)"""
        self._load_model()
        return self._model_data
    
    def predict(self, image_path):
        """
        Predict HER2 status from image
        
        Args:
            image_path: Path to HER2 tissue image
            
        Returns:
            dict: Prediction results with probabilities
        """
        try:
            # Ensure model is loaded
            self._load_model()
            
            logger.info(f"Predicting HER2 status for: {image_path}")
            
            # Extract features using simple feature extractor (matches training)
            features = self._feature_extractor.extract_features_from_image(image_path)
            features = features.reshape(1, -1)
            
            logger.info(f"Features shape: {features.shape}")
            logger.info(f"Scaler expects: {self._scaler.n_features_in_} features")
            
            # Scale features
            scaled_features = self._scaler.transform(features)
            logger.info(f"Scaled features shape: {scaled_features.shape}")
            
            # Predict
            probabilities = self._ensemble.predict_proba(scaled_features)[0]
            predicted_class_idx = int(np.argmax(probabilities))
            predicted_class = self.HER2_CLASSES[predicted_class_idx]
            confidence = float(probabilities[predicted_class_idx])
            
            logger.info(f"Prediction: {predicted_class} with confidence {confidence:.4f}")
            logger.info(f"Probabilities: {probabilities}")
            
            # Determine risk level
            risk_level = self.RISK_LEVELS[predicted_class]
            risk_score = self._calculate_risk_score(predicted_class, confidence, probabilities)
            
            # Calculate entropy for uncertainty measure
            entropy = self._calculate_entropy(probabilities)
            
            return {
                'her2_status': predicted_class,
                'confidence': confidence,
                'probabilities': {
                    'HER2_0': float(probabilities[0]),
                    'HER2_1+': float(probabilities[1]),
                    'HER2_2+': float(probabilities[2]),
                    'HER2_3+': float(probabilities[3])
                },
                'risk_level': risk_level,
                'risk_score': risk_score,
                'entropy': entropy,
                'model_version': 'v2.4.1'
            }
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            logger.error(traceback.format_exc())
            raise RuntimeError(f"Prediction failed: {str(e)}")
    
    def _calculate_risk_score(self, predicted_class: str, confidence: float, probabilities: np.ndarray) -> float:
        """
        Calculate overall risk score (0-100) based on:
        1. The predicted HER2 class (primary factor)
        2. The confidence in that prediction
        3. The weighted sum of probabilities for higher-risk classes
        
        This provides clinically meaningful risk scores:
        - HER2_0 with high confidence: ~15-20
        - HER2_1+ with high confidence: ~35-45
        - HER2_2+ with high confidence: ~65-75
        - HER2_3+ with high confidence: ~85-95
        """
        # Get base risk score for the predicted class
        base_score = self.BASE_RISK_SCORES[predicted_class]
        
        # Adjust based on confidence (±10 points)
        # High confidence reinforces the base score
        # Low confidence moves it toward the middle
        confidence_adjustment = (confidence - 0.5) * 20  # Range: -10 to +10
        
        # Also consider the weighted contribution of higher-risk classes
        # This captures cases where probability is spread across multiple classes
        risk_weights = np.array([0, 0.1, 0.3, 0.5])  # Weights for 0, 1+, 2+, 3+
        probability_contribution = np.sum(probabilities * risk_weights) * 20  # Range: 0-10
        
        # Combine factors
        risk_score = base_score + confidence_adjustment + probability_contribution
        
        # Clamp to 0-100
        risk_score = max(0, min(100, risk_score))
        
        return float(risk_score)
    
    def _calculate_entropy(self, probabilities: np.ndarray) -> float:
        """Calculate Shannon entropy of the probability distribution."""
        epsilon = 1e-10
        entropy = -np.sum(probabilities * np.log(probabilities + epsilon))
        return float(entropy)


# Singleton instance (but model loads lazily)
predictor = HER2Predictor()