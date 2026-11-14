#!/usr/bin/env python3
"""Offline static asset preparation only; not a runtime service.
Retain existing source textures unchanged. WebP derivatives use lossless
compression for the lunar no-data grid, and bounded lossy compression for Mars.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'client/public/assets'
for body, filename in [('moon', 'moon-surface-equirectangular.png'), ('mars', 'mars-surface.jpg')]:
    with Image.open(ASSETS / filename) as source:
        for width, suffix in [(256, 'preview'), (512, 'compact')]:
            image = source.convert('RGB').resize((width, width // 2), Image.Resampling.LANCZOS)
            target = ASSETS / f'{body}-surface-{suffix}.webp'
            image.save(target, 'WEBP', lossless=body == 'moon', quality=82, method=6)
            print(f'{target.relative_to(ROOT)}: {image.width}x{image.height}, {target.stat().st_size} bytes')
