"""
GradCAM Generator Service - Fixed version matching streamlit_app.py implementation

Uses a pretrained ResNet18 as a surrogate model to generate Grad-CAM explanations.
This provides meaningful attention maps showing which regions of the image the model
focuses on, even though our HER2 classifier uses handcrafted features.
"""

import os
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
import logging
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.cm as cm

logger = logging.getLogger(__name__)


def try_import_torch():
    """Try to import torch and torchvision."""
    try:
        import torch
        import torchvision
        return torch, torchvision
    except Exception as e:
        logger.error(f"PyTorch import failed: {e}")
        return None, None


class GradCAMGenerator:
    """
    Generate Grad-CAM explanations for HER2 predictions.
    
    Uses a pretrained ResNet18 model (following the streamlit_app.py approach)
    to generate attention heatmaps that show which regions of the tissue image
    are most relevant for classification.
    """
    
    def __init__(self, device=None):
        torch_module, torchvision_module = try_import_torch()
        if torch_module is None:
            raise ImportError("PyTorch is not installed")
        
        self.torch = torch_module
        self.torchvision = torchvision_module
        
        if device is None:
            self.device = self.torch.device('cuda' if self.torch.cuda.is_available() else 'cpu')
        else:
            self.device = self.torch.device(device)
        
        self._model = None
        self._transform = None
    
    def _load_model(self):
        """Load pretrained ResNet18 model (lazy loading)."""
        if self._model is not None:
            return
        
        import torchvision.models as models
        import torchvision.transforms as T
        
        # Use ResNet18 as the surrogate model (matching streamlit_app.py)
        self._model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
        self._model.eval()
        self._model.to(self.device)
        
        # Standard ImageNet preprocessing
        self._transform = T.Compose([
            T.Resize((224, 224)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        logger.info(f"Loaded ResNet18 model on {self.device}")
    
    def _preprocess_image(self, pil_img: Image.Image):
        """Preprocess image for ResNet inference."""
        self._load_model()
        orig_size = pil_img.size[::-1]  # (height, width)
        tensor = self._transform(pil_img.convert('RGB')).unsqueeze(0).to(self.device)
        return tensor, orig_size
    
    def compute_gradcam(self, pil_img: Image.Image, target_layer_name: str = 'layer4') -> np.ndarray:
        """
        Compute Grad-CAM heatmap using pretrained ResNet18.
        
        This follows the exact implementation from streamlit_app.py:
        1. Register forward and backward hooks on the target layer
        2. Run forward pass and get predicted class
        3. Back-propagate gradients for the predicted class
        4. Compute weighted combination of activations
        5. Resize to original image size
        
        Args:
            pil_img: PIL Image object
            target_layer_name: Name of the layer to compute Grad-CAM on (default: 'layer4')
            
        Returns:
            np.ndarray: Heatmap normalized to 0-1, same size as original image
        """
        self._load_model()
        
        # Storage for hooks
        activations = {}
        gradients = {}
        
        def forward_hook(module, inp, out):
            activations['value'] = out.detach()
        
        def backward_hook(module, grad_in, grad_out):
            gradients['value'] = grad_out[0].detach()
        
        # Find target layer
        target_layer = dict(self._model.named_modules()).get(target_layer_name, None)
        if target_layer is None:
            # Fallback to last conv layer
            for n, m in reversed(list(self._model.named_modules())):
                if isinstance(m, nn.Conv2d):
                    target_layer = m
                    logger.info(f"Using fallback layer: {n}")
                    break
        
        if target_layer is None:
            raise RuntimeError("No conv layer found for Grad-CAM")
        
        # Register hooks
        fh = target_layer.register_forward_hook(forward_hook)
        bh = target_layer.register_full_backward_hook(backward_hook)
        
        try:
            # Preprocess image
            inp_tensor, orig_size = self._preprocess_image(pil_img)
            
            # Forward pass
            out = self._model(inp_tensor)
            pred_class = int(out.argmax(dim=1).item())
            
            # Backward pass for predicted class
            self._model.zero_grad()
            score = out[0, pred_class]
            score.backward()
            
            # Get activations and gradients
            act = activations['value'].squeeze(0)  # C x H x W
            grad = gradients['value'].squeeze(0)   # C x H x W
            
            # Global average pooling of gradients
            weights = grad.mean(dim=(1, 2))  # C
            
            # Weighted combination of activations
            cam = (weights[:, None, None] * act).sum(dim=0).cpu().numpy()
            
            # ReLU (keep only positive values)
            cam = np.maximum(cam, 0)
            
            # Normalize to 0-1
            if cam.max() > 0:
                cam = (cam - cam.min()) / (cam.max() - cam.min())
            else:
                cam = np.zeros_like(cam)
            
            # Resize to original image size
            cam_img = Image.fromarray((cam * 255).astype(np.uint8))
            cam_img = cam_img.resize((orig_size[1], orig_size[0]), resample=Image.BILINEAR)
            cam_arr = np.array(cam_img) / 255.0
            
            return cam_arr
            
        finally:
            # Clean up hooks
            fh.remove()
            bh.remove()
    
    def overlay_heatmap_on_image(
        self, 
        pil_img: Image.Image, 
        heatmap: np.ndarray, 
        cmap: str = 'jet', 
        alpha: float = 0.5
    ) -> Image.Image:
        """
        Overlay a heatmap on the original image.
        
        Args:
            pil_img: Original PIL Image
            heatmap: 2D numpy array (0-1) of the heatmap
            cmap: Matplotlib colormap name
            alpha: Blending factor (0=original only, 1=heatmap only)
            
        Returns:
            PIL Image: Blended image with heatmap overlay
        """
        img = pil_img.convert('RGBA')
        
        # Convert heatmap to RGBA using colormap
        colormap = cm.get_cmap(cmap)
        heat_rgba = colormap(heatmap)  # HxWx4 float in 0..1
        heat_uint8 = (heat_rgba * 255).astype(np.uint8)
        heat_img = Image.fromarray(heat_uint8).convert('RGBA')
        heat_img = heat_img.resize(img.size, resample=Image.BILINEAR)
        
        # Blend images
        blended = Image.blend(img, heat_img, alpha=alpha)
        return blended.convert('RGB')
    
    def generate(self, image_path: str, target_class: int, output_path: str) -> str:
        """
        Generate Grad-CAM heatmap and save to file.
        
        Args:
            image_path: Path to input image
            target_class: Predicted class index (0-3) - currently unused, 
                         Grad-CAM is computed for the model's predicted class
            output_path: Where to save the heatmap overlay
            
        Returns:
            str: Path to saved heatmap image
        """
        try:
            # Load image
            pil_img = Image.open(image_path).convert('RGB')
            
            # Compute Grad-CAM
            heatmap = self.compute_gradcam(pil_img)
            
            # Create overlay
            overlay = self.overlay_heatmap_on_image(pil_img, heatmap, cmap='jet', alpha=0.5)
            
            # Save
            overlay.save(output_path)
            logger.info(f"Saved Grad-CAM overlay to {output_path}")
            
            return output_path
            
        except Exception as e:
            logger.error(f"Grad-CAM generation failed: {e}")
            raise


# Singleton instance
gradcam_generator = GradCAMGenerator()