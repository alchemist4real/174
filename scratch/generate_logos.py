import os
from PIL import Image, ImageDraw

def create_logo_png(size=512):
    # Create dark background image (#0D0D0D) with smooth rounded corners & lime accent border
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Outer container (Dark card #0D0D0D with subtle lime glow border #E2FF4A)
    padding = int(size * 0.05)
    corner_radius = int(size * 0.18)
    
    # Draw border glow / background card
    draw.rounded_rectangle(
        [padding, padding, size - padding, size - padding],
        radius=corner_radius,
        fill=(13, 13, 13, 255),
        outline=(226, 255, 74, 180),
        width=int(size * 0.02)
    )
    
    # Draw horizontal slot bar
    slot_y = int(size * 0.28)
    slot_x1 = int(size * 0.28)
    slot_x2 = int(size * 0.72)
    draw.line([slot_x1, slot_y, slot_x2, slot_y], fill=(250, 250, 250, 255), width=int(size * 0.035))
    
    # Grid of pills (3 columns x 2 rows)
    cols = [int(size * 0.28), int(size * 0.50), int(size * 0.72)]
    rows = [int(size * 0.48), int(size * 0.72)]
    r = int(size * 0.085)
    
    for cy in rows:
        for cx in cols:
            # White circle pill base
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(250, 250, 250, 255))
            # Diagonal line cut
            cut_len = int(r * 0.65)
            draw.line(
                [cx - cut_len, cy - cut_len, cx + cut_len, cy + cut_len],
                fill=(13, 13, 13, 255),
                width=int(size * 0.025)
            )
            
    # Save to public/ directory & root directory
    os.makedirs('public', exist_ok=True)
    img.save('public/logo.png', 'PNG')
    img.save('public/apple-touch-icon.png', 'PNG')
    img.save('public/favicon.png', 'PNG')
    img.save('logo.png', 'PNG')
    img.save('apple-touch-icon.png', 'PNG')
    img.save('favicon.png', 'PNG')
    print(f"Generated 512x512 PNG logos at public/logo.png, public/apple-touch-icon.png, public/favicon.png!")

if __name__ == '__main__':
    create_logo_png(512)
