import time
from pathlib import Path

from PIL import Image

IMG = Path('her2-2+-score_test_179.png')
OUT = Path('gradcam_overlay_test.png')

def main():
    if not IMG.exists():
        print(f"Test image not found: {IMG.resolve()}")
        return

    print('Loading streamlit app helpers...')
    from streamlit_app import compute_gradcam, overlay_heatmap_on_image

    img = Image.open(IMG)
    img = img.convert('RGB')

    print('Computing Grad-CAM (surrogate ResNet-18)...')
    t0 = time.time()
    try:
        heat = compute_gradcam(img, device='cpu')
    except Exception as e:
        print('Grad-CAM computation failed:', e)
        return
    t1 = time.time()
    print(f'Grad-CAM computed in {t1 - t0:.2f}s')

    print('Creating overlay and saving...')
    overlay = overlay_heatmap_on_image(img, heat, alpha=0.6)
    overlay.save(OUT)
    print(f'Overlay saved to: {OUT.resolve()}')

if __name__ == '__main__':
    main()
