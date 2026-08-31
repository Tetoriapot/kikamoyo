from pathlib import Path
from PIL import Image, ImageDraw
import math

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


def cubic(p0, p1, p2, p3, t):
    u = 1 - t
    return (
        u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0],
        u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1],
    )


def render(size, maskable=False):
    supersample = 4
    canvas_size = size * supersample
    image = Image.new("RGBA", (canvas_size, canvas_size), (37, 40, 61, 255) if maskable else (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    unit = canvas_size / 64
    content_scale = 0.75 if maskable else 1.0

    def point(x, y):
        return ((32 + (x - 32) * content_scale) * unit, (32 + (y - 32) * content_scale) * unit)

    if not maskable:
        draw.rounded_rectangle((0, 0, canvas_size, canvas_size), radius=15 * unit, fill="#25283d")

    cx, cy = point(18, 18)
    radius = 8 * content_scale * unit
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill="#ef655b")
    draw.polygon([point(41, 10), point(51, 28), point(31, 28)], fill="#3db7a5")

    first = [point(*cubic((10, 45), (18, 33), (18, 33), (26, 45), t / 24)) for t in range(25)]
    second = [point(*cubic((26, 45), (34, 57), (34, 57), (42, 45), t / 24)) for t in range(1, 25)]
    wave = first + second
    wave_width = max(1, round(6 * content_scale * unit))
    draw.line(wave, fill="#f4bd40", width=wave_width, joint="curve")
    wave_radius = wave_width / 2
    for x, y in wave:
        draw.ellipse((x - wave_radius, y - wave_radius, x + wave_radius, y + wave_radius), fill="#f4bd40")

    pill_width = round(8 * content_scale * unit)
    pill_height = round(15 * content_scale * unit)
    pill = Image.new("RGBA", (pill_width * 3, pill_height * 3), (0, 0, 0, 0))
    pill_draw = ImageDraw.Draw(pill)
    left = pill_width
    top = pill_height
    pill_draw.rounded_rectangle((left, top, left + pill_width, top + pill_height), radius=pill_width / 2, fill="#f6f1e8")
    pill = pill.rotate(-30, resample=Image.Resampling.BICUBIC, expand=False)
    px, py = point(50, 47.5)
    image.alpha_composite(pill, (round(px - pill.width / 2), round(py - pill.height / 2)))

    return image.resize((size, size), Image.Resampling.LANCZOS)


render(192).save(PUBLIC / "icon-192.png", optimize=True)
render(512).save(PUBLIC / "icon-512.png", optimize=True)
render(512, maskable=True).save(PUBLIC / "icon-maskable-512.png", optimize=True)
render(180, maskable=True).save(PUBLIC / "apple-touch-icon.png", optimize=True)
