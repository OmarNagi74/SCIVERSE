#!/usr/bin/env python3
"""Create/validate TerraTwin's small, bounded Tycho DEM proof from official SLDEM2015.

Download the upstream JP2 manually to assets/source/ (that path is gitignored).
Only the 129x129 local crop and provenance manifest enter the static build.
The JP2 color/browse appearance is never used to derive height.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import struct
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/source/SLDEM2015_512_60S_30S_315_360.JP2"
OUT_DIR = ROOT / "client/public/assets/terrain"
GRID_PATH = OUT_DIR / "tycho-sldem2015.i16"
MANIFEST_PATH = OUT_DIR / "tycho-sldem2015.json"
SOURCE_URL = "https://imbrium.mit.edu/EXTRAS/SLDEM2015/TILES/JP2/SLDEM2015_512_60S_30S_315_360.JP2"
LABEL_URL = "https://imbrium.mit.edu/EXTRAS/SLDEM2015/TILES/JP2/SLDEM2015_512_60S_30S_315_360_JP2.LBL"
WIDTH = HEIGHT = 129
PIXELS_PER_DEGREE = 512
NO_DATA = -32768
SCALE_METERS = 0.5
BOUNDS = {"west": -15.0, "east": -7.0, "north": -40.0, "south": -46.0}
EXPECTED_SOURCE_SIZE = (23040, 15360)
JP2_UNSIGNED_BIAS = 32768
JP2_RAW_NO_DATA = 0
# This is the exact known official source dimension; allow its decoded pixel count.
Image.MAX_IMAGE_PIXELS = EXPECTED_SOURCE_SIZE[0] * EXPECTED_SOURCE_SIZE[1]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def decode_jp2_sample(value: object) -> int:
    if value is None or not isinstance(value, (int, float)):
        raise ValueError("Color imagery or null pixels are not accepted as elevation")
    value = int(value)
    if value < 0 or value > 65535:
        raise ValueError("Source sample is outside the expected 16-bit count range")
    # Pillow exposes JP2's unsigned component. The PDS/AUX scale metadata and
    # published actual range show that the encoded bias must be removed first.
    return value - JP2_UNSIGNED_BIAS


def extract_grid(source_path: Path) -> tuple[list[int], dict[str, float | int | str]]:
    if not source_path.is_file():
        raise FileNotFoundError(f"Download the official source tile to {source_path}")
    with Image.open(source_path) as image:
        if image.format != "JPEG2000" or image.size != EXPECTED_SOURCE_SIZE:
            raise ValueError(f"Expected official 23040x15360 JP2; got {image.format} {image.size}")
        if image.mode not in {"I;16", "I;16B", "I", "F"}:
            raise ValueError(f"Expected a numeric 16-bit elevation raster, not mode {image.mode}")
        # Source product is the simple-cylindrical tile 315E–360E, 60S–30S.
        # Rows run from the declared maximum (north) latitude downward.
        west_east = (BOUNDS["west"] + 360.0, BOUNDS["east"] + 360.0)
        x0 = round((west_east[0] - 315.0) * PIXELS_PER_DEGREE)
        x1 = round((west_east[1] - 315.0) * PIXELS_PER_DEGREE)
        y0 = round((-30.0 - BOUNDS["north"]) * PIXELS_PER_DEGREE)
        y1 = round((-30.0 - BOUNDS["south"]) * PIXELS_PER_DEGREE)
        if not (0 <= x0 < x1 <= image.width and 0 <= y0 < y1 <= image.height):
            raise ValueError("Tycho region falls outside the documented source tile bounds")
        crop = image.crop((x0, y0, x1 + 1, y1 + 1))
        values: list[int] = []
        for row in range(HEIGHT):
            source_y = round((y1 - y0) * row / (HEIGHT - 1))
            for column in range(WIDTH):
                source_x = round((x1 - x0) * column / (WIDTH - 1))
                pixel = crop.getpixel((source_x, source_y))
                if isinstance(pixel, tuple):
                    raise ValueError("Color imagery is not accepted as an elevation raster")
                if pixel is None or not isinstance(pixel, (int, float)):
                    raise ValueError("Source sample is not a numeric elevation count")
                values.append(decode_jp2_sample(pixel))
    covered = [value for value in values if value != NO_DATA]
    if not covered:
        raise ValueError("The selected Tycho patch contains no valid DEM samples")
    heights = [value * SCALE_METERS for value in covered]
    metadata = {
        "sourceSha256": sha256(source_path),
        "sourceMode": image.mode,
        "sourceWidth": EXPECTED_SOURCE_SIZE[0],
        "sourceHeight": EXPECTED_SOURCE_SIZE[1],
        "jp2UnsignedBias": JP2_UNSIGNED_BIAS,
        "sourceNoDataRaw": JP2_RAW_NO_DATA,
        "sourceCropPixels": {"west": x0, "east": x1, "north": y0, "south": y1},
        "sampleMinimumMeters": min(heights),
        "sampleMaximumMeters": max(heights),
        "validSamples": len(covered),
        "noDataSamples": len(values) - len(covered),
    }
    return values, metadata


def make_manifest(metadata: dict[str, float | int | str], grid_hash: str) -> dict[str, object]:
    return {
        "id": "tycho-sldem2015-poc",
        "title": "Tycho regional relative relief visualization",
        "width": WIDTH,
        "height": HEIGHT,
        "bounds": BOUNDS,
        "coordinateConvention": "Simple cylindrical; planetocentric latitude; positive-east longitude; west bounds expressed in the local −180°..180° UI convention.",
        "gridEncoding": "Signed 16-bit little-endian samples; source JP2 512 px/degree sampled to a 129 × 129 demonstration mesh.",
        "scaleMeters": SCALE_METERS,
        "noData": NO_DATA,
        "referenceRadiusMeters": 1737400,
        "dataUrl": "/assets/terrain/tycho-sldem2015.i16",
        "sha256": grid_hash,
        "source": {
            "productId": "SLDEM2015_512_60S_30S_315_360",
            "productVersion": "V2.0",
            "dataSetId": "LRO-L-LOLA-4-GDR-V1.0",
            "url": SOURCE_URL,
            "labelUrl": LABEL_URL,
            "auxiliaryScaleMetadataUrl": "https://imbrium.mit.edu/EXTRAS/SLDEM2015/TILES/JP2/SLDEM2015_512_60S_30S_315_360_AUX.XML",
            "scaleReferenceUrl": "https://pds-geosciences.wustl.edu/missions/lro/lola_faq.htm",
            "citation": "Barker et al. (2016), Icarus 273, 346–355, doi:10.1016/j.icarus.2015.07.039; source producer LRO LOLA Team (David E. Smith); credit NASA LOLA and JAXA SELENE/Kaguya teams.",
            "sourceSha256": metadata["sourceSha256"],
            "sourceWidth": metadata["sourceWidth"],
            "sourceHeight": metadata["sourceHeight"],
            "sourceMode": metadata["sourceMode"],
            "jp2UnsignedBias": metadata["jp2UnsignedBias"],
            "sourceNoDataRaw": metadata["sourceNoDataRaw"],
            "sourceCropPixels": metadata["sourceCropPixels"],
            "sourceNoData": NO_DATA,
            "scaleMeaning": "Signed count = unsigned JP2 pixel − 32768; source no-data is raw 0 / decoded −32768; 0.5 metres per valid signed count; absolute radius offset 1,737,400 metres per PDS LOLA FAQ.",
        },
        "sampleMinimumMeters": metadata["sampleMinimumMeters"],
        "sampleMaximumMeters": metadata["sampleMaximumMeters"],
        "validSamples": metadata["validSamples"],
        "noDataSamples": metadata["noDataSamples"],
        "processing": "Offline crop of the official elevation raster only. No image-derived heights. Output grid is decimated and visualized as relative relief; vertical exaggeration is a UI-only display transform. No values are exposed as site measurements.",
    }


def build(source_path: Path) -> None:
    values, metadata = extract_grid(source_path)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    GRID_PATH.write_bytes(b"".join(struct.pack("<h", value) for value in values))
    manifest = make_manifest(metadata, sha256(GRID_PATH))
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"built {GRID_PATH.relative_to(ROOT)} ({GRID_PATH.stat().st_size} bytes)")
    print(f"built {MANIFEST_PATH.relative_to(ROOT)} ({MANIFEST_PATH.stat().st_size} bytes)")
    print(f"valid={metadata['validSamples']} noData={metadata['noDataSamples']} sampled-height-range={metadata['sampleMinimumMeters']}..{metadata['sampleMaximumMeters']} m")
    print(f"source sha256={metadata['sourceSha256']}")


def assert_manifest_matches(actual: dict[str, object], expected: dict[str, object]) -> None:
    if actual != expected:
        mismatched = sorted(key for key in expected if actual.get(key) != expected[key])
        raise AssertionError(f"Terrain manifest differs from source-derived contract in: {', '.join(mismatched)}")


def validate(source_path: Path) -> None:
    if not GRID_PATH.is_file() or not MANIFEST_PATH.is_file():
        raise FileNotFoundError("Build the local Tycho terrain assets first")
    actual = json.loads(MANIFEST_PATH.read_text())
    values, metadata = extract_grid(source_path)
    expected_bytes = b"".join(struct.pack("<h", value) for value in values)
    actual_bytes = GRID_PATH.read_bytes()
    if actual_bytes != expected_bytes:
        raise AssertionError("Terrain grid is not the exact expected artifact from the preserved source tile")
    expected_manifest = make_manifest(metadata, hashlib.sha256(actual_bytes).hexdigest())
    assert_manifest_matches(actual, expected_manifest)
    print(f"validated {WIDTH}x{HEIGHT} source-derived grid, exact source bounds/mode/crop/scale/counts/extrema/provenance, artifact bytes and SHA-256={actual['sha256']}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    if args.validate_only:
        validate(args.source)
    else:
        build(args.source)


if __name__ == "__main__":
    main()
