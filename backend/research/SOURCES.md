# TerraTwin dataset and model - sources, method and caveats (2026-11-13)

## Data files (data/)
| File | Rows | Source | Notes |
|---|---|---|---|
| earth_grid_features.csv | 593 | Climate: NASA POWER climatology API. Elevation: Open-Meteo (Copernicus DEM) or OpenTopoData mapzen. Relief/slope: OpenTopoData mapzen, 3x3 points at 1 km. | 5-degree land grid. Polar rows thinned (every 15 deg of longitude above 70 deg latitude, every 10 deg at 60-65). 22 points have no usable terrain (`terrain_flag`): the DEM is broken along 70S and under the Greenland ice sheet. POWER cells are about 50 km, so climate is an area average. |
| earth_features.csv | 107 | NASA POWER; elevation and terrain from Open-Meteo (first 28) or OpenTopoData mapzen (rest) | 78 known analog sites, 3 Egyptian candidates, 26 control cities. Coordinates typed from memory; see `coords_verified`. The Askja point sits on the lake (relief 0). |
| targets_features.csv | 13 | Moon: LRO Diviner Polar Resource Product v2 (5 km box), Lunar Prospector GRS elements. Mars: Mars Climate Database v6.2 nearest cell, MGS MOLA 128 px/deg terrain, Odyssey GRS elements, MSL REMS for Gale (`rems_*`). | `site_status` says whether a lunar site is on NASA's 2024 list of nine Artemis III regions. NASA publishes region names, not centre coordinates, so lunar coordinates are approximate (`coords_verified = no`). MCD is a model on coarse cells (Gale's cell is at -572 m, the crater floor at -4503 m). Moon/Mars precipitation and NDVI are set to 0 as physical constants. |

## Model (terratwin_model.py)
- Features are transformed (log1p for precipitation, relief, slope) and z-scored with the spread across Earth points.
- Five themes: thermal (mean/max/min temperature, diurnal and seasonal range), dryness (precipitation), pressure, terrain (relief, slope), surface (albedo). A theme uses only the features both sides have: the Moon has no diurnal/seasonal/min temperature or albedo here.
- Theme distance = RMS z-gap. Overall = weighted RMS of theme distances, equal weights by default.
- Scores are percentiles among the 685 Earth points (100 = closest place on Earth). Absolute similarity is always low, so percentiles are what to show.
- Outputs: outputs/theme_scores.csv, rankings.csv, fidelity_gaps.csv, validation.json, frontend_scores.json.
- Fidelity gaps use literature values for gravity, day length and surface radiation (hard-coded in BODY); check them before quoting.

## Validation (equal weights, 92 sites, 30 targets)
| | Mars | Moon |
|---|---|---|
| Known analog sites ranked above control cities (AUC) | 0.91 | 0.921 |
| Known analog sites ranked above the Earth grid (AUC) | 0.671 | 0.594 |
| Median percentile: analog sites / controls | 75.1 / 8.6 | 55.6 / 9.7 |
| Labelled sites: analogs / controls | 59 / 26 | 20 / 26 |

Per theme, analogs vs controls (AUC): Mars thermal 0.883, dryness 0.903, pressure 0.882, terrain 0.205, surface 0.62; Moon thermal 0.737, dryness 0.81, pressure 0.859, terrain 0.765.
The Mars terrain theme still works against the known analogs even with rugged targets added: most Mars targets are flat lander sites, and at 1 km scale flat cities match them better than rugged field sites.
These are in-sample numbers for the fixed equal-weight engine (nothing is fitted). The two Egyptian candidate sites are not counted as labels.

## Training (train_weights.py, training/)
- training/earth_X.csv (raw) and earth_X_scaled.csv (model space) hold all 685 Earth points with `label_mars_analog` / `label_moon_analog` (1 = known analog, 0 = control, blank = unlabeled). targets_X_scaled.csv, theme_distances.csv and feature_spec.json complete the set.
- train_weights.py fits one weight per theme by grid search; the gain over equal weights is small, so equal weights stay the default (`python terratwin_model.py --learned` applies them). The AI layer below supersedes it.

## Not in these files
- Vegetation (NDVI): the MODIS service timed out.
- Mars 5-degree terrain+chemistry grid, Mars climate grid, Moon south-pole grid: pulled in the browser but not exportable; `python scrape_all.py mars mcd moon` regenerates them. scrape_all.py has been run only against mocked responses.
- Mineralogy on the Earth side, radiation and illumination maps.

## Sites and targets added on the last pull
- data/earth_features.csv now has 92 sites: 64 known analogs (42 new), 26 controls (22 new), 2 Egyptian candidates. New sites use OpenTopoData mapzen for elevation and terrain; the original 28 use Open-Meteo. Nine of the original sites were checked against Google Places and sit within 11 km; the rest are unverified.
- data/targets_extra.csv adds 17 targets (13 Mars, 4 Moon) with the same columns as targets_features.csv; the model loads both (30 targets).
- run_all.bat re-pulls everything with scrape_all.py, then runs the model and the weight training.

## AI layer (terratwin_ai.py, terratwin_agent.py)
terratwin_ai.py commands: `evaluate` (blind tests), `train` (final scores), `recommend TARGET PURPOSE`, `explain SITE TARGET [PURPOSE]`.

1. Similarity engine, body level: "best3" = mean distance to the three closest targets of a body.
2. Purpose presets (PURPOSES): theme weights for general, rover_mobility, thermal_systems, ice_drilling, crew_operations, life_detection. Expert-set starting points, not learned.
3. Analog classifier: gradient boosting (120 trees, depth 2) on 10 scaled climate/terrain features plus 6 rock-type flags. Positives are known analog sites; negatives are control cities plus the unlabeled grid at weight 0.3.
4. Explanation: `explain()` writes a report from `facts()` only; an optional `llm=callable` rewrites it under a prompt that forbids new numbers. The LLM path has not been run.
5. Shipped score (`FINAL`): similarity + classifier for both bodies.

### Geology features (added for the Moon)
geo_volcanic, geo_sedimentary, geo_unconsolidated, geo_crystalline, geo_ice, geo_young: keyword flags from the finest-scale unit returned by the Macrostrat geologic map API (CC-BY 4.0) at each point. 87 of 700 points have no unit (mostly the 85S row). They feed the classifier only; the similarity engine has no target-side geology.

### Labels
107 sites: 78 known analogs (59 for Mars, 34 for the Moon, some for both), 26 control cities, 3 Egyptian candidates (Gilf Kebir, White Desert, Kamil Crater) that are never used as labels. The 14 lunar sites added last are Apollo training sites, lunar rover test sites and impact craters, 10 of them in the USA.

### Blind test 1: random folds (10 x 5-fold; every number is on held-out sites)
| Method | Mars vs controls | Mars vs Earth grid | Mars held-out analogs in top 25% | Moon vs controls | Moon vs Earth grid | Moon held-out analogs in top 25% |
|---|---|---|---|---|---|---|
| similarity_best3 | 0.925 | 0.671 | 0.47 | 0.934 | 0.619 | 0.32 |
| classifier_boosting_no_geology | 0.934 | 0.807 | 0.64 | 0.881 | 0.772 | 0.67 |
| classifier_boosting | 0.951 | 0.853 | 0.74 | 0.876 | 0.800 | 0.74 |
| combined (shipped) | 0.955 | 0.798 | 0.60 | 0.920 | 0.760 | 0.57 |

### Blind test 2: whole regions held out (20 x 30 degree blocks)
| Method | Mars vs controls | Mars vs Earth grid | Mars top 25% | Moon vs controls | Moon vs Earth grid | Moon top 25% |
|---|---|---|---|---|---|---|
| similarity_best3 | 0.923 | 0.671 | 0.47 | 0.936 | 0.622 | 0.32 |
| classifier_boosting | 0.937 | 0.842 | 0.73 | 0.854 | 0.736 | 0.56 |
| combined (shipped) | 0.950 | 0.785 | 0.58 | 0.918 | 0.717 | 0.53 |

Caveats: (a) the shipped method was chosen from these tables, so its numbers are slightly optimistic; (b) labelled sites are hand-picked places and the grid is a regular 5-degree sample, so part of the "vs Earth grid" gain may come from telling sites from grid points; "vs controls" does not have this problem; (c) for the Moon, most of the gain came from adding labels (20 to 34), and geology added a little on top.

### Agent (terratwin_agent.py)
`python terratwin_agent.py "Where in Egypt can we test a Mars rover for Jezero crater?"` Steps: understand (target/body, purpose, region, count) -> search each target under the purpose weights -> cross-check with the classifier -> audit data quality -> diversify -> confidence per pick -> answer written from tool results only, with a step log. Control cities are never recommended. `run()` uses a built-in keyword planner and needs no LLM. `run_with_llm(text, chat)` lets an LLM drive the same tools through JSON tool calls; it has been exercised only with a scripted stand-in, not a real model.

### Outputs
outputs/ai_evaluation.json, ai_scores.csv (similarity, classifier, combined and final percentile per Earth point and body), ai_new_candidates.csv, ai_classifier_feature_importance.json.
Final percentiles (Mars / Moon): Gilf Kebir 91.3 / 85.0, Kamil Crater 90.7 / 90.1, White Desert 75.4 / 40.6. Kamil Crater's coordinates are unverified and its 119 m local relief looks too high for a 45 m crater in flat desert, so check it before quoting.

Note: `scrape_all.py sites` and `scrape_all.py earth` rewrite the Earth tables without the geology flags and without the hand-pulled values; run_all.bat therefore pulls only the three large Moon/Mars grids.
