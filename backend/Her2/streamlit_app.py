import io
import time
import joblib
import numpy as np
from PIL import Image, ImageOps
import streamlit as st
from typing import Tuple


@st.cache_data
def load_model(path='deployable_breast_cancer_model.joblib'):
    data = joblib.load(path)
    return data


def extract_features_from_image_pil(pil_img: Image.Image) -> np.ndarray:
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

    # Texture features (grayscale)
    gray_img = np.mean(img_array, axis=2)
    features.extend([
        np.mean(gray_img),
        np.std(gray_img),
        np.mean(np.abs(np.gradient(gray_img)[0])),
        np.mean(np.abs(np.gradient(gray_img)[1])),
    ])

    return np.array(features)


def predict(model_data, pil_img: Image.Image):
    model = model_data['model']
    scaler = model_data['scaler']
    class_names = model_data['class_names']

    feats = extract_features_from_image_pil(pil_img)
    feats_scaled = scaler.transform(feats.reshape(1, -1))
    probs = model.predict_proba(feats_scaled)[0]
    pred_idx = int(np.argmax(probs))
    return class_names[pred_idx], probs, feats



def overlay_heatmap_on_image(pil_img: Image.Image, heatmap: np.ndarray, cmap='jet', alpha=0.5):
    import matplotlib
    import matplotlib.cm as cm

    img = pil_img.convert('RGBA')
    h, w = heatmap.shape
    # convert heatmap to RGBA using colormap
    colormap = cm.get_cmap(cmap)
    heat_rgba = colormap(heatmap)  # HxWx4 float in 0..1
    heat_uint8 = (heat_rgba * 255).astype(np.uint8)
    heat_img = Image.fromarray(heat_uint8).convert('RGBA')
    heat_img = heat_img.resize(img.size, resample=Image.BILINEAR)

    blended = Image.blend(img, heat_img, alpha=alpha)
    return blended


def try_import_torch():
    try:
        import torch
        import torchvision
        return torch, torchvision
    except Exception:
        import traceback
        err = traceback.format_exc()
        print('STREAMLIT: torch import failed:\n', err)
        return None, None


def load_resnet_surrogate(device='cpu'):
    torch, torchvision = try_import_torch()
    if torch is None:
        raise ImportError('PyTorch is not installed')

    model = torchvision.models.resnet18(pretrained=True)
    model.eval()
    model.to(device)
    return model


def preprocess_for_resnet(pil_img: Image.Image, device='cpu') -> Tuple['torch.Tensor', Tuple[int,int]]:
    # lazy import to avoid hard dependency at module import time
    import torch
    import torchvision.transforms as T

    orig_size = pil_img.size[::-1]  # (h,w)
    transform = T.Compose([
        T.Resize((224, 224)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    t = transform(pil_img.convert('RGB')).unsqueeze(0).to(device)
    return t, orig_size


def compute_gradcam(pil_img: Image.Image, target_layer_name='layer4', device='cpu') -> np.ndarray:
    """Compute Grad-CAM map using a pretrained ResNet surrogate for the image.
    Returns a heatmap resized to the original image height/width in 0..1 range.
    """
    torch, torchvision = try_import_torch()
    if torch is None:
        raise ImportError('PyTorch is not installed')

    model = load_resnet_surrogate(device=device)

    # Hook to capture activations and gradients
    activations = {}
    gradients = {}

    def forward_hook(module, inp, out):
        activations['value'] = out.detach()

    def backward_hook(module, grad_in, grad_out):
        gradients['value'] = grad_out[0].detach()

    # find target layer
    target_layer = dict(model.named_modules()).get(target_layer_name, None)
    if target_layer is None:
        # fallback to last conv
        for n, m in reversed(list(model.named_modules())):
            if isinstance(m, torch.nn.Conv2d):
                target_layer = m
                break
    if target_layer is None:
        raise RuntimeError('No conv layer found for Grad-CAM')

    fh = target_layer.register_forward_hook(forward_hook)
    bh = target_layer.register_backward_hook(backward_hook)

    inp, orig_size = preprocess_for_resnet(pil_img, device=device)
    out = model(inp)
    pred_class = int(out.argmax(dim=1).item())

    # compute grads wrt predicted class
    model.zero_grad()
    score = out[0, pred_class]
    score.backward()

    # get activations and gradients
    act = activations['value'].squeeze(0)  # C x H x W
    grad = gradients['value'].squeeze(0)   # C x H x W

    # global-average-pool gradients
    weights = grad.mean(dim=(1, 2))  # C

    # weighted combination
    cam = (weights[:, None, None] * act).sum(dim=0).cpu().numpy()
    # relu
    cam = np.maximum(cam, 0)
    # normalize
    if cam.max() > 0:
        cam = (cam - cam.min()) / (cam.max() - cam.min())
    else:
        cam = np.zeros_like(cam)

    # resize to original image size
    from PIL import Image
    cam_img = Image.fromarray((cam * 255).astype(np.uint8))
    cam_img = cam_img.resize((orig_size[1], orig_size[0]), resample=Image.BILINEAR)
    cam_arr = np.array(cam_img) / 255.0

    fh.remove()
    bh.remove()

    return cam_arr


def per_feature_importance(model_data, feats, target_class_idx, delta_frac=0.1):
    """Simple per-feature perturbation importance: modify each feature by +/- delta_frac and measure probability change."""
    model = model_data['model']
    scaler = model_data['scaler']

    base_scaled = scaler.transform(feats.reshape(1, -1))
    base_prob = model.predict_proba(base_scaled)[0][target_class_idx]

    importances = []
    for i in range(len(feats)):
        f = feats.copy()
        # perturb up
        delta = max(1e-6, abs(feats[i]) * delta_frac)
        f[i] = feats[i] + delta
        p_up = model.predict_proba(scaler.transform(f.reshape(1, -1)))[0][target_class_idx]

        # perturb down
        f = feats.copy()
        f[i] = feats[i] - delta
        p_dn = model.predict_proba(scaler.transform(f.reshape(1, -1)))[0][target_class_idx]

        # importance: max absolute change
        imp = max(abs(base_prob - p_up), abs(base_prob - p_dn))
        importances.append(imp)

    importances = np.array(importances)
    # normalize
    if importances.max() > 0:
        importances = importances / importances.max()
    return importances


def main():
    st.title("Breast Cancer Model Tester — Prediction + Grad-CAM")

    st.markdown("Upload an image; the app will show prediction, probabilities, a per-feature importance chart, and a surrogate Grad-CAM overlay computed from a pretrained ResNet.")

    # Confidence Threshold Slider
    st.sidebar.title("Settings")
    conf_threshold = st.sidebar.slider("Confidence Threshold", 0.0, 1.0, 0.60, 0.05, help="If the highest probability is below this value, the result is flagged as uncertain.")
    
    st.sidebar.markdown("### Safety Filters")
    st.sidebar.slider("Whitespace Threshold", 0.0, 1.0, 0.85, 0.05, key='ws_thresh', help="Max fraction of white pixels allowed.")
    st.sidebar.slider("Blur Threshold (Laplacian)", 0.0, 500.0, 25.0, 10.0, key='blur_thresh', help="Min sharpness. Higher = must be sharper.")
    st.sidebar.slider("Stain Coverage Threshold", 0.0, 1.0, 0.15, 0.05, key='stain_thresh', help="Min fraction of pixels matching HER2 stains (Purple/Brown).")
    st.sidebar.slider("Similarity Threshold (OOD)", 0.0, 1.0, 0.5, 0.05, key='hist_thresh', help="Statistical match to training data. Higher = stricter.")
    st.sidebar.slider("Entropy Threshold", 0.0, 3.0, 1.5, 0.1, key='ent_thresh', help="Max prediction entropy allowed.")
    


    model_data = load_model()

    uploaded = st.file_uploader("Upload image (PNG, JPG)", type=['png', 'jpg', 'jpeg'])

    # If nothing uploaded and no previous image in session, prompt and exit
    if uploaded is None and 'uploaded_image' not in st.session_state:
        st.info("Upload an image to get started.")
        return

    # If a new upload arrived, read bytes and store in session_state (and clear derived state)
    if uploaded is not None:
        # use getvalue() when available to avoid consuming the stream
        data = uploaded.getvalue() if hasattr(uploaded, 'getvalue') else uploaded.read()
        if st.session_state.get('_last_upload_bytes') != data:
            st.session_state['_last_upload_bytes'] = data
            img = Image.open(io.BytesIO(data))
            img = ImageOps.exif_transpose(img)
            st.session_state['uploaded_image'] = img
            # clear previous predictions/gradcam for a fresh start
            for k in ['predicted', 'probs', 'feats', 'predicted_idx', 'gradcam_image', 'prediction_result']:
                if k in st.session_state:
                    del st.session_state[k]
        else:
            # bytes matched previously, reuse stored image
            img = st.session_state.get('uploaded_image')
    else:
        img = st.session_state.get('uploaded_image')

    st.image(img, caption='Uploaded image', use_container_width=True)

    # Prediction button stores results in session_state so they persist across reruns
    if st.button('Predict'):
        with st.spinner('Running prediction...'):
            # Import safety wrapper
            import model_safety
            
            # Config from sidebar
            config = {
                'whitespace_thresh': st.session_state.get('ws_thresh', 0.85),
                'blur_thresh': st.session_state.get('blur_thresh', 50.0),
                'stain_thresh': st.session_state.get('stain_thresh', 0.15),
                'hist_thresh': st.session_state.get('hist_thresh', 0.5),
                'entropy_thresh': st.session_state.get('ent_thresh', 1.5)
            }
            
            result = model_safety.safe_predict(img, model_data, config)
            st.session_state['prediction_result'] = result

    # Display persisted prediction if available
    if 'prediction_result' in st.session_state:
        res = st.session_state['prediction_result']
        status = res['status']
        
        if status == 'Success':
            pred_label = res['prediction']
            conf = res['confidence']
            entropy = res['entropy']
            
            st.success(f"Prediction: {pred_label} (Confidence: {conf:.2f})")
            st.info(f"Uncertainty (Entropy): {entropy:.2f}")

            # Store simple values for other charts
            st.session_state['predicted'] = pred_label
            st.session_state['probs'] = res['probabilities']
            st.session_state['feats'] = res['features']
            st.session_state['predicted_idx'] = int(np.argmax(res['probabilities']))
            
            # Show probabilities
            class_names = model_data['class_names']
            for n, p in zip(class_names, res['probabilities']):
                st.write(f"- {n}: {p:.4f}")

            # per-feature importance
            st.subheader('Per-feature importance (perturbation)')
            feat_names = []
            # construct labels consistent with training (RGB + Texture)
            for c in ['R', 'G', 'B']:
                feat_names += [f"{c}_mean", f"{c}_std", f"{c}_median", f"{c}_p25", f"{c}_p75"]
            feat_names += ['gray_mean', 'gray_std', 'grad_mean_x', 'grad_mean_y']

            import pandas as pd
            feats_arr = np.array(st.session_state['feats'])
            pred_idx = int(st.session_state.get('predicted_idx', 0))
            importances = per_feature_importance(model_data, feats_arr, pred_idx)
            df = pd.DataFrame({'feature': feat_names, 'importance': importances})
            st.bar_chart(df.set_index('feature'))

            # Grad-CAM (surrogate CNN)
            st.subheader('Surrogate Grad-CAM (ResNet-18)')
            cam_colormap = st.selectbox('Colormap', options=['jet', 'viridis', 'plasma', 'magma'], index=0)
            cam_alpha = st.slider('Overlay alpha', 0.0, 1.0, 0.6)

            if st.button('Compute Grad-CAM'):
                if 'uploaded_image' not in st.session_state:
                    st.warning('Please upload an image first.')
                else:
                    if 'gradcam_image' not in st.session_state:
                        with st.spinner('Computing Grad-CAM...'):
                            try:
                                print('STREAMLIT: starting Grad-CAM computation')
                                heat = compute_gradcam(st.session_state['uploaded_image'], device='cpu')
                                print('STREAMLIT: gradcam computed, creating overlay')
                                overlay = overlay_heatmap_on_image(st.session_state['uploaded_image'], heat, cmap=cam_colormap, alpha=cam_alpha)
                                if hasattr(overlay, 'convert'):
                                    overlay = overlay.convert('RGB')
                                # resize overlay to match display size if needed, but here it matches orig
                                st.session_state['gradcam_image'] = overlay
                                print('STREAMLIT: gradcam computed and stored in session_state')
                            except Exception as e:
                                st.error(f'Grad-CAM failed: {e}')

            if 'gradcam_image' in st.session_state:
                st.image(st.session_state['gradcam_image'], caption='Grad-CAM overlay', use_container_width=True)
                
        elif status == 'Rejected':
            st.error(f"⛔ Image Rejected: {res['reason']}")
            # Clear invalid predictions
            for k in ['predicted', 'probs', 'feats', 'gradcam_image']:
                if k in st.session_state:
                    del st.session_state[k]
                    
        elif status == 'Unknown':
            st.warning(f"⚠️ Model Uncertain: {res['reason']}")
            st.write(f"Entropy: {res['entropy']:.2f}")
            # Could show probs if desired
            if 'probabilities' in res:
                st.write("Probabilities (too diffuse):", res['probabilities'])


if __name__ == '__main__':
    main()
