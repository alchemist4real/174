import os
import shutil
from PIL import Image, ImageDraw, ImageFont

# Color tokens
AVOCADO = (220, 244, 162)      # #DCF4A2
AVOCADO_DARK = (199, 232, 133) # #C7E885
FRENCH_BLUE = (0, 85, 164)     # #0055A4
DEEP_BLUE = (0, 56, 112)       # #003870

FONTS_DIR = os.path.join(os.getcwd(), 'assets', 'fonts')

def get_font(name, size):
    path = os.path.join(FONTS_DIR, name)
    if os.path.exists(path):
        return ImageFont.truetype(path, size)
    return ImageFont.load_default()

# Canvas setup
W, H = 1600, 2300
img = Image.new('RGB', (W, H), AVOCADO)
draw = ImageDraw.Draw(img)

# Load fonts
f_dotbold_huge = get_font('OffBit-DotBold.ttf', 110)
f_dotbold_large = get_font('OffBit-DotBold.ttf', 56)
f_dotbold_med = get_font('OffBit-DotBold.ttf', 38)
f_dotbold_sm = get_font('OffBit-DotBold.ttf', 24)
f_dotbold_badge = get_font('OffBit-DotBold.ttf', 20)

f_dot_large = get_font('OffBit-Dot.ttf', 44)
f_dot_med = get_font('OffBit-Dot.ttf', 32)
f_dot_sm = get_font('OffBit-Dot.ttf', 24)

f_bold_large = get_font('OffBit-Bold.ttf', 48)
f_bold_sm = get_font('OffBit-Bold.ttf', 24)

f_reg_large = get_font('OffBit-Regular.ttf', 48)
f_reg_sm = get_font('OffBit-Regular.ttf', 24)

f_101b_large = get_font('OffBit-101Bold.ttf', 48)
f_101b_sm = get_font('OffBit-101Bold.ttf', 24)

f_101_large = get_font('OffBit-101.ttf', 48)
f_101_sm = get_font('OffBit-101.ttf', 24)

# 1. Top Header Bar
draw.line([(80, 120), (W - 80, 120)], fill=FRENCH_BLUE, width=4)
# Pill logo shape
draw.rounded_rectangle([(80, 48), (145, 98)], radius=14, fill=FRENCH_BLUE)
draw.line([(95, 62), (130, 62)], fill=AVOCADO, width=3)
draw.ellipse([(92, 74), (108, 90)], fill=AVOCADO)
draw.ellipse([(118, 74), (134, 90)], fill=AVOCADO)
draw.text((165, 42), "Mr. Capsules", font=f_dotbold_large, fill=FRENCH_BLUE)
draw.text((165, 96), "2-FONT LOCKDOWN • OFFBIT DOTBOLD & OFFBIT DOT", font=f_dotbold_badge, fill=DEEP_BLUE)
draw.text((W - 400, 70), "PALETTE: #DCF4A2 / #0055A4", font=f_dotbold_badge, fill=FRENCH_BLUE)

# 2. Main Hero Specimen Box (Avocado Panel + French Blue Ink)
box1_y = 155
box1_h = 420
draw.rounded_rectangle([(80, box1_y), (W - 80, box1_y + box1_h)], radius=16, fill=AVOCADO_DARK, outline=FRENCH_BLUE, width=4)
draw.text((120, box1_y + 35), "PRIMARY BRAND FONT • OFFBIT DOTBOLD (700)", font=f_dotbold_badge, fill=DEEP_BLUE)
draw.text((120, box1_y + 80), "Mr. Capsules", font=f_dotbold_huge, fill=FRENCH_BLUE)
draw.text((120, box1_y + 225), "Medical Education Sanctuary • CBT Knowledge Pool", font=f_dot_large, fill=FRENCH_BLUE)

# Badges in Box 1
def draw_pill(x, y, text, font, bg, fg, border=None):
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pw, ph = tw + 32, th + 18
    if border:
        draw.rounded_rectangle([(x, y), (x + pw, y + ph)], radius=ph//2, fill=bg, outline=border, width=3)
    else:
        draw.rounded_rectangle([(x, y), (x + pw, y + ph)], radius=ph//2, fill=bg)
    draw.text((x + 16, y + 8), text, font=font, fill=fg)
    return pw

x_pos = 120
badge_y = box1_y + 320
x_pos += draw_pill(x_pos, badge_y, "OffBit DotBold (Primary)", f_dotbold_badge, FRENCH_BLUE, AVOCADO) + 16
x_pos += draw_pill(x_pos, badge_y, "CONTRAST RATIO 6.2:1 (AAA)", f_dotbold_badge, AVOCADO, FRENCH_BLUE, border=FRENCH_BLUE) + 16
draw_pill(x_pos, badge_y, "TITLE CASE: Mr. Capsules", f_dotbold_badge, AVOCADO, FRENCH_BLUE, border=FRENCH_BLUE)

# 3. Inverted Hero Specimen Box (French Blue Panel + Avocado Ink)
box2_y = box1_y + box1_h + 40
box2_h = 390
draw.rounded_rectangle([(80, box2_y), (W - 80, box2_y + box2_h)], radius=16, fill=FRENCH_BLUE, outline=DEEP_BLUE, width=4)
draw.text((120, box2_y + 35), "INVERTED PERSONA SPECIMEN • HIGH CONTRAST DARK INVERSION", font=f_dotbold_badge, fill=AVOCADO)
draw.text((120, box2_y + 75), "Mrs. Capsules", font=f_dotbold_huge, fill=AVOCADO)
draw.text((120, box2_y + 220), "Mrs. Capsules • Medical Knowledge Sanctuary", font=f_dot_large, fill=AVOCADO)

# Badges in Box 2
x_pos = 120
badge_y2 = box2_y + 300
x_pos += draw_pill(x_pos, badge_y2, "TITLE CASE: Mrs. Capsules", f_dotbold_badge, AVOCADO, FRENCH_BLUE) + 16
x_pos += draw_pill(x_pos, badge_y2, "CREAMY AVOCADO INK (#DCF4A2)", f_dotbold_badge, FRENCH_BLUE, AVOCADO, border=AVOCADO) + 16
draw_pill(x_pos, badge_y2, "FRENCH BLUE FILL (#0055A4)", f_dotbold_badge, FRENCH_BLUE, AVOCADO, border=AVOCADO)

# 4. Section Title: 2-Font System Specimens
grid_y = box2_y + box2_h + 50
draw.text((80, grid_y), "2-FONT SYSTEM LOCKDOWN SPECIMENS", font=f_dotbold_large, fill=FRENCH_BLUE)
draw.line([(80, grid_y + 70), (W - 80, grid_y + 70)], fill=FRENCH_BLUE, width=3)

# 6 Variant Cards (2 Columns x 3 Rows)
variants = [
    ("1. PRIMARY: OFFBIT DOTBOLD (700)", "OffBit-DotBold.ttf", f_dotbold_large, f_dotbold_med, f_dotbold_sm),
    ("2. SECONDARY: OFFBIT DOT (400)", "OffBit-Dot.ttf", f_dot_large, f_dot_med, f_dot_sm),
    ("3. DISPLAY: Mr. Capsules", "OffBit-DotBold.ttf", f_dotbold_large, f_dot_med, f_dot_sm),
    ("4. DISPLAY: Mrs. Capsules", "OffBit-DotBold.ttf", f_dotbold_large, f_dot_med, f_dot_sm),
    ("5. MONO CODE / METADATA", "OffBit-Dot.ttf", f_dot_large, f_dot_med, f_dot_sm),
    ("6. BUTTONS & UI CONTROLS", "OffBit-DotBold.ttf", f_dotbold_large, f_dotbold_med, f_dotbold_sm),
]

col_w = (W - 160 - 30) // 2
card_h = 240
row_start_y = grid_y + 90

for idx, (title, fname, f_main, f_sub, f_sm) in enumerate(variants):
    r = idx // 2
    c = idx % 2
    cx = 80 + c * (col_w + 30)
    cy = row_start_y + r * (card_h + 24)
    
    # Card Background
    draw.rounded_rectangle([(cx, cy), (cx + col_w, cy + card_h)], radius=12, fill=AVOCADO_DARK, outline=FRENCH_BLUE, width=3)
    # Header tag
    draw.text((cx + 24, cy + 18), title, font=f_dotbold_badge, fill=DEEP_BLUE)
    draw.line([(cx + 24, cy + 46), (cx + col_w - 24, cy + 46)], fill=FRENCH_BLUE, width=1)
    # Render "Mr. Capsules" or "Mrs. Capsules" in Title Case
    if "Mrs." in title or idx == 3:
        draw.text((cx + 24, cy + 58), "Mrs. Capsules", font=f_main, fill=FRENCH_BLUE)
        draw.text((cx + 24, cy + 128), "Mrs. Capsules • Persona Active", font=f_sub, fill=FRENCH_BLUE)
    else:
        draw.text((cx + 24, cy + 58), "Mr. Capsules", font=f_main, fill=FRENCH_BLUE)
        draw.text((cx + 24, cy + 128), "Mr. Capsules • Standard Persona", font=f_sub, fill=FRENCH_BLUE)
    draw.text((cx + 24, cy + 188), "Medical CBT Pool • 78 MCP Tools • Semester 2.5", font=f_sm, fill=DEEP_BLUE)

# 5. Bottom UI Component Bar
btm_y = row_start_y + 3 * (card_h + 24) + 20
draw.line([(80, btm_y), (W - 80, btm_y)], fill=FRENCH_BLUE, width=2)
draw.text((80, btm_y + 16), "LIVE UI COMPONENTS: EXACT TITLE CASE (Mr. / Mrs. Capsules)", font=f_dotbold_badge, fill=FRENCH_BLUE)

btn_y = btm_y + 50
draw_pill(80, btn_y, "Enter Mr. Capsules →", f_dotbold_badge, FRENCH_BLUE, AVOCADO)
draw_pill(370, btn_y, "Mrs. Capsules Preview", f_dotbold_badge, AVOCADO, FRENCH_BLUE, border=FRENCH_BLUE)
draw_pill(680, btn_y, "Launch CBT Sanctuary", f_dotbold_badge, FRENCH_BLUE, AVOCADO)
draw_pill(990, btn_y, "Docs & API Explorer", f_dotbold_badge, AVOCADO, FRENCH_BLUE, border=FRENCH_BLUE)

# Save image
out_project = os.path.join(os.getcwd(), 'assets', 'offbit_specimen.png')
out_public = os.path.join(os.getcwd(), 'public', 'assets', 'offbit_specimen.png')
out_artifact_dir = r"C:\Users\Thosiba\.gemini\antigravity\brain\ea881b8e-8ed3-40cf-995a-ae3f2480a27a"
out_artifact = os.path.join(out_artifact_dir, "offbit_specimen.png")

img.save(out_project, 'PNG')
if not os.path.exists(os.path.dirname(out_public)):
    os.makedirs(os.path.dirname(out_public), exist_ok=True)
img.save(out_public, 'PNG')

if os.path.exists(out_artifact_dir):
    img.save(out_artifact, 'PNG')

print("Successfully rendered high-resolution specimen poster to:", out_project)
