#!/usr/bin/env python3
"""Fast deterministic tests for the local terrain pipeline's decoding and geographic contract."""
from __future__ import annotations
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("build_tycho_terrain", ROOT / "scripts/build_tycho_terrain.py")
assert spec and spec.loader
terrain = importlib.util.module_from_spec(spec)
spec.loader.exec_module(terrain)

class TychoTerrainPipelineTests(unittest.TestCase):
    def test_geographic_crop_pixels_match_official_simple_cylindrical_bounds(self) -> None:
        self.assertEqual(terrain.BOUNDS, {"west": -15.0, "east": -7.0, "north": -40.0, "south": -46.0})
        source_west = round(((-15.0 + 360.0) - 315.0) * 512)
        source_east = round(((-7.0 + 360.0) - 315.0) * 512)
        source_north = round((-30.0 - (-40.0)) * 512)
        source_south = round((-30.0 - (-46.0)) * 512)
        self.assertEqual((source_west, source_east, source_north, source_south), (15360, 19456, 5120, 8192))
        self.assertEqual(terrain.decode_jp2_sample(0), -32768)
        self.assertEqual(terrain.decode_jp2_sample(32768), 0)
        self.assertEqual(terrain.decode_jp2_sample(65535), 32767)
        # The official JPEG2000/AUX actual range gives this independent bias check.
        self.assertEqual(terrain.decode_jp2_sample(20546), -12222)
        self.assertEqual(terrain.decode_jp2_sample(37621), 4853)
        self.assertEqual(terrain.decode_jp2_sample(20546) * 0.5, -6111.0)

    def test_output_contract_is_small_local_signed16_with_half_metre_scale(self) -> None:
        self.assertEqual((terrain.WIDTH, terrain.HEIGHT), (129, 129))
        self.assertEqual(terrain.SCALE_METERS, 0.5)
        self.assertEqual(terrain.NO_DATA, -32768)
        self.assertEqual(terrain.JP2_UNSIGNED_BIAS, 32768)
        self.assertEqual(terrain.JP2_RAW_NO_DATA, 0)
        self.assertEqual(terrain.GRID_PATH.name, "tycho-sldem2015.i16")
        self.assertEqual(terrain.MANIFEST_PATH.name, "tycho-sldem2015.json")

    def test_expected_manifest_comparison_rejects_tampered_height_or_provenance(self) -> None:
        metadata = {
            "sourceSha256": "a" * 64, "sourceWidth": 23040, "sourceHeight": 15360,
            "sourceMode": "I;16", "jp2UnsignedBias": 32768, "sourceNoDataRaw": 0,
            "sourceCropPixels": {"west": 15360, "east": 19456, "north": 5120, "south": 8192},
            "sampleMinimumMeters": -1000.0, "sampleMaximumMeters": 1200.0,
            "validSamples": 16640, "noDataSamples": 1,
        }
        expected = terrain.make_manifest(metadata, "b" * 64)
        terrain.assert_manifest_matches(expected, expected)
        for key, value in [("sampleMinimumMeters", -1001), ("validSamples", 1), ("dataUrl", "/wrong"), ("referenceRadiusMeters", 1)]:
            mutated = dict(expected)
            mutated[key] = value
            with self.subTest(field=key), self.assertRaises(AssertionError):
                terrain.assert_manifest_matches(mutated, expected)
        mutated_source = dict(expected)
        mutated_source["source"] = dict(expected["source"])
        mutated_source["source"]["jp2UnsignedBias"] = 0
        with self.assertRaises(AssertionError):
            terrain.assert_manifest_matches(mutated_source, expected)

    def test_color_images_are_not_accepted_as_height(self) -> None:
        with self.assertRaises(ValueError):
            terrain.decode_jp2_sample((1, 2, 3))
        with self.assertRaises(ValueError):
            terrain.decode_jp2_sample(None)
        with self.assertRaises(ValueError):
            terrain.decode_jp2_sample(1000000)

if __name__ == "__main__":
    unittest.main()
