#!/usr/bin/env python3
"""Build and validate TerraTwin's lunar full-globe display texture.

The preserved source is a 1024 × 449 USGS GLD100-derived preview that represents
only 79°N to 79°S (158° of latitude). It is *not* a full-sphere equirectangular
image. This script maps every source row into that exact latitude band in a
1024 × 512 (2:1) equirectangular PNG. The actual 11° north/south polar caps
receive a deliberately non-terrain coverage treatment.

The generated PNG is a visualization texture, not an analytical raster layer.
"""

from __future__ import annotations

import argparse
from math import ceil, floor, isclose
from pathlib import Path
from typing import cast

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "source" / "moon-surface.jpg"
OUTPUT = ROOT / "client" / "public" / "assets" / "moon-surface-equirectangular.png"
RENDERER_SOURCE = ROOT / "client" / "src" / "features" / "explorer" / "planet-r3f" / "PlanetScene.tsx"

OUTPUT_WIDTH = 1024
OUTPUT_HEIGHT = 512
NORTH_LATITUDE = 79.0
SOUTH_LATITUDE = -79.0
FULL_SPHERE_DEGREES = 180.0

# Deliberately abstract no-data treatment. These colors do not encode terrain.
MASK = (42, 63, 72)
GRID = (113, 156, 170)


def latitude_for_output_boundary(y: float) -> float:
    """Latitude at a top-origin equirectangular output pixel boundary."""
    return 90.0 - (y / OUTPUT_HEIGHT) * FULL_SPHERE_DEGREES


def output_boundary_for_latitude(latitude: float) -> float:
    """Top-origin equirectangular output pixel boundary for a latitude."""
    return (90.0 - latitude) / FULL_SPHERE_DEGREES * OUTPUT_HEIGHT


TOP_COVERAGE_BOUNDARY = output_boundary_for_latitude(NORTH_LATITUDE)
BOTTOM_COVERAGE_BOUNDARY = output_boundary_for_latitude(SOUTH_LATITUDE)
COVERAGE_HEIGHT = BOTTOM_COVERAGE_BOUNDARY - TOP_COVERAGE_BOUNDARY
FIRST_COVERAGE_ROW = floor(TOP_COVERAGE_BOUNDARY)
LAST_COVERAGE_ROW_EXCLUSIVE = ceil(BOTTOM_COVERAGE_BOUNDARY)


def coverage_fraction_for_row(y: int) -> float:
    """Fraction of output row y that geographically belongs to the GLD100 band."""
    return max(0.0, min(y + 1.0, BOTTOM_COVERAGE_BOUNDARY) - max(float(y), TOP_COVERAGE_BOUNDARY))


def source_coordinate_for_output_row(y: int, source_height: int) -> float:
    """Map the covered part of an output row to its source sample coordinate.

    The formula maps source image boundaries [0, source_height] to the exact
    output coverage boundaries [TOP_COVERAGE_BOUNDARY, BOTTOM_COVERAGE_BOUNDARY].
    For the two fractional edge rows, sample at the center of the portion that
    is actually covered rather than at the center of the whole output pixel.
    """
    covered_top = max(float(y), TOP_COVERAGE_BOUNDARY)
    covered_bottom = min(float(y + 1), BOTTOM_COVERAGE_BOUNDARY)
    sample_boundary = (covered_top + covered_bottom) / 2.0
    return ((sample_boundary - TOP_COVERAGE_BOUNDARY) / COVERAGE_HEIGHT) * source_height - 0.5


def no_data_texture() -> Image.Image:
    """Create the explicit coverage/no-data base without surface content."""
    image = Image.new("RGB", (OUTPUT_WIDTH, OUTPUT_HEIGHT), MASK)
    draw = ImageDraw.Draw(image)
    for x in range(0, OUTPUT_WIDTH, 64):
        draw.line((x, 0, x, OUTPUT_HEIGHT - 1), fill=GRID, width=1)
    for y in range(7, OUTPUT_HEIGHT, 8):
        draw.line((0, y, OUTPUT_WIDTH - 1, y), fill=GRID, width=1)
    return image


def resampled_source_row(source: Image.Image, coordinate: float) -> Image.Image:
    """Linearly resample a source row at a geographic output sample location.

    Horizontal pixels are copied 1:1. Vertically, standard linear resampling
    handles the sub-pixel 449.422-pixel target coverage height without dropping
    either edge of the 449-row source image.
    """
    coordinate = max(0.0, min(float(source.height - 1), coordinate))
    lower = floor(coordinate)
    upper = min(source.height - 1, lower + 1)
    fraction = coordinate - lower
    lower_row = source.crop((0, lower, source.width, lower + 1))
    if upper == lower:
        return lower_row
    upper_row = source.crop((0, upper, source.width, upper + 1))
    return Image.blend(lower_row, upper_row, fraction)


def participating_source_rows(source_height: int) -> set[int]:
    """Return every source row that contributes to a covered output sample."""
    rows: set[int] = set()
    for y in range(FIRST_COVERAGE_ROW, LAST_COVERAGE_ROW_EXCLUSIVE):
        if coverage_fraction_for_row(y) <= 0:
            continue
        coordinate = max(0.0, min(float(source_height - 1), source_coordinate_for_output_row(y, source_height)))
        lower = floor(coordinate)
        rows.add(lower)
        rows.add(min(source_height - 1, lower + 1))
    return rows


def build_display_texture(source: Image.Image) -> Image.Image:
    if source.size != (OUTPUT_WIDTH, 449):
        raise ValueError(f"Expected the preserved lunar preview to be 1024x449; received {source.size}")

    display = no_data_texture()
    no_data = display.copy()

    for y in range(FIRST_COVERAGE_ROW, LAST_COVERAGE_ROW_EXCLUSIVE):
        fraction = coverage_fraction_for_row(y)
        if fraction <= 0:
            continue
        source_row = resampled_source_row(source, source_coordinate_for_output_row(y, source.height))
        if fraction < 1:
            # The two boundary rows straddle the exact ±79° coverage boundaries.
            # Mix only by true geographic area; no source imagery is extended into the caps.
            source_row = Image.blend(no_data.crop((0, y, OUTPUT_WIDTH, y + 1)), source_row, fraction)
        display.paste(source_row, (0, y))

    return display


def assert_mapping(source: Image.Image, display: Image.Image, output_format: str | None) -> None:
    """Perform deterministic dimension, coverage, alignment, and renderer checks."""
    if display.size != (OUTPUT_WIDTH, OUTPUT_HEIGHT):
        raise AssertionError(f"Expected {OUTPUT_WIDTH}x{OUTPUT_HEIGHT} output; received {display.size}")
    if display.width != 2 * display.height:
        raise AssertionError("The output is not a 2:1 full-sphere equirectangular texture")
    if output_format != "PNG":
        raise AssertionError("The output is not a PNG lossless raster")
    if source.size != (OUTPUT_WIDTH, 449):
        raise AssertionError("The preserved lunar source dimensions changed")

    # Independently derive expected boundaries from the supplied latitude range.
    expected_top = OUTPUT_HEIGHT * (90.0 - NORTH_LATITUDE) / 180.0
    expected_bottom = OUTPUT_HEIGHT * (90.0 - SOUTH_LATITUDE) / 180.0
    if not isclose(TOP_COVERAGE_BOUNDARY, expected_top, abs_tol=1e-12):
        raise AssertionError("The northern coverage edge is not in the exact equirectangular location")
    if not isclose(BOTTOM_COVERAGE_BOUNDARY, expected_bottom, abs_tol=1e-12):
        raise AssertionError("The southern coverage edge is not in the exact equirectangular location")

    # Exact geographic alignment lives at sub-pixel output boundaries.
    if not isclose(latitude_for_output_boundary(TOP_COVERAGE_BOUNDARY), NORTH_LATITUDE, abs_tol=1e-12):
        raise AssertionError("The source northern boundary is not mapped to 79°N")
    if not isclose(latitude_for_output_boundary(BOTTOM_COVERAGE_BOUNDARY), SOUTH_LATITUDE, abs_tol=1e-12):
        raise AssertionError("The source southern boundary is not mapped to 79°S")
    if not isclose(COVERAGE_HEIGHT, 449.4222222222222, abs_tol=1e-9):
        raise AssertionError("The target latitude band has an unexpected pixel height")

    # Every original source row contributes to at least one output sample.
    source_rows = participating_source_rows(source.height)
    if source_rows != set(range(source.height)):
        missing = sorted(set(range(source.height)) - source_rows)
        raise AssertionError(f"Valid source rows were not mapped into the display: {missing[:8]}")
    first_coordinate = source_coordinate_for_output_row(FIRST_COVERAGE_ROW, source.height)
    last_coordinate = source_coordinate_for_output_row(LAST_COVERAGE_ROW_EXCLUSIVE - 1, source.height)
    if first_coordinate > 0 or last_coordinate < source.height - 1:
        raise AssertionError("The output sampling domain does not reach both source-image edges")

    # Fully uncovered cap rows must contain only the no-data treatment, not terrain pixels.
    no_data = no_data_texture()
    top_cap = (0, 0, OUTPUT_WIDTH, FIRST_COVERAGE_ROW)
    bottom_cap = (0, LAST_COVERAGE_ROW_EXCLUSIVE, OUTPUT_WIDTH, OUTPUT_HEIGHT)
    if display.crop(top_cap).tobytes() != no_data.crop(top_cap).tobytes():
        raise AssertionError("The fully uncovered north polar cap contains non-no-data pixels")
    if display.crop(bottom_cap).tobytes() != no_data.crop(bottom_cap).tobytes():
        raise AssertionError("The fully uncovered south polar cap contains non-no-data pixels")
    if coverage_fraction_for_row(FIRST_COVERAGE_ROW) >= 1 or coverage_fraction_for_row(LAST_COVERAGE_ROW_EXCLUSIVE - 1) >= 1:
        raise AssertionError("Boundary coverage rows lost their required sub-pixel geographic treatment")

    renderer = RENDERER_SOURCE.read_text(encoding="utf-8")
    texture_loader = RENDERER_SOURCE.with_name("usePlanetTexture.ts").read_text(encoding="utf-8")
    if '"/assets/moon-surface-equirectangular.png"' not in texture_loader or "usePlanetTexture(props.body" not in renderer:
        raise AssertionError("The Moon renderer is not configured to load the corrected display texture")
    if "moon-surface-masked.webp" in renderer + texture_loader:
        raise AssertionError("The Moon renderer still references the deprecated non-equirectangular derivative")
    if "bumpMap={sourceTexture" in renderer:
        raise AssertionError("The colorized visual preview must not be interpreted as lunar elevation relief")


def assert_synthetic_geographic_alignment() -> None:
    """Test the transform against an independent row-coded synthetic raster.

    Each source row receives a known color. The generated 2:1 result is then
    compared at every output latitude row with values calculated directly from
    the independent ±79° boundary equations, including the two fractional edge
    rows. This catches stretching, latitude shifts, and dropped source rows.
    """
    height = 449
    synthetic = Image.new("RGB", (OUTPUT_WIDTH, height))
    draw = ImageDraw.Draw(synthetic)
    for row in range(height):
        draw.line(
            (0, row, OUTPUT_WIDTH - 1, row),
            fill=(row % 256, row // 256, (row * 3) % 256),
        )

    transformed = build_display_texture(synthetic)
    no_data = no_data_texture()
    expected_top = OUTPUT_HEIGHT * (90.0 - NORTH_LATITUDE) / 180.0
    expected_bottom = OUTPUT_HEIGHT * (90.0 - SOUTH_LATITUDE) / 180.0
    expected_band_height = expected_bottom - expected_top
    used_rows: set[int] = set()

    for y in range(OUTPUT_HEIGHT):
        overlap_top = max(float(y), expected_top)
        overlap_bottom = min(float(y + 1), expected_bottom)
        fraction = max(0.0, overlap_bottom - overlap_top)
        if fraction == 0.0:
            if transformed.getpixel((512, y)) != no_data.getpixel((512, y)):
                raise AssertionError(f"Output latitude row {y} outside ±79° contains source data")
            continue

        sample_edge = (overlap_top + overlap_bottom) / 2.0
        source_y = ((sample_edge - expected_top) / expected_band_height) * height - 0.5
        source_y = max(0.0, min(float(height - 1), source_y))
        lower = floor(source_y)
        upper = min(height - 1, lower + 1)
        interpolation = source_y - lower
        used_rows.add(lower)
        used_rows.add(upper)

        low = cast(tuple[int, int, int], synthetic.getpixel((512, lower)))
        high = cast(tuple[int, int, int], synthetic.getpixel((512, upper)))
        background = cast(tuple[int, int, int], no_data.getpixel((512, y)))
        actual = cast(tuple[int, int, int], transformed.getpixel((512, y)))
        expected = tuple(
            (low[channel] * (1.0 - interpolation) + high[channel] * interpolation) * fraction
            + background[channel] * (1.0 - fraction)
            for channel in range(3)
        )
        if any(abs(actual[channel] - expected[channel]) > 1.0 for channel in range(3)):
            raise AssertionError(f"Latitude row {y} is not mapped to its expected source latitude")

    if used_rows != set(range(height)):
        missing = sorted(set(range(height)) - used_rows)
        raise AssertionError(f"Synthetic mapping failed to preserve source rows: {missing[:8]}")


def assert_output_matches_source_transform(source: Image.Image, display: Image.Image) -> None:
    """Reject stale or altered output pixels by rebuilding the expected raster in memory."""
    expected = build_display_texture(source)
    if display.tobytes() != expected.tobytes():
        raise AssertionError(
            "The existing lunar display does not match the deterministic transform of the preserved source"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--validate-only", action="store_true", help="Validate the existing output without regenerating it")
    args = parser.parse_args()

    source = Image.open(SOURCE).convert("RGB")
    if args.validate_only:
        opened_display = Image.open(OUTPUT)
        output_format = opened_display.format
        display = opened_display.convert("RGB")
    else:
        display = build_display_texture(source)
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        display.save(OUTPUT, format="PNG", optimize=True)
        opened_display = Image.open(OUTPUT)
        output_format = opened_display.format
        display = opened_display.convert("RGB")
        source = Image.open(SOURCE).convert("RGB")

    assert_mapping(source, display, output_format)
    assert_synthetic_geographic_alignment()
    assert_output_matches_source_transform(source, display)
    print(f"Verified {OUTPUT.relative_to(ROOT)}: {OUTPUT_WIDTH}x{OUTPUT_HEIGHT} 2:1 PNG")
    print(f"Mapped all {source.height} source rows into {NORTH_LATITUDE:.0f}°N to {SOUTH_LATITUDE:.0f}°S")
    print(
        "Exact coverage boundaries: "
        f"y={TOP_COVERAGE_BOUNDARY:.6f} ({NORTH_LATITUDE:.0f}°N), "
        f"y={BOTTOM_COVERAGE_BOUNDARY:.6f} ({SOUTH_LATITUDE:.0f}°S); "
        f"{FIRST_COVERAGE_ROW} fully no-data rows at each polar cap."
    )


if __name__ == "__main__":
    main()
