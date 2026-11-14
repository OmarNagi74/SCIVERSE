"""Learn theme weights for the TerraTwin analog model.

Labels are scarce (22 known analog sites, 4 control cities), so this fits only one weight per
theme (5 numbers per body) by grid search on the weight simplex, and reports leave-one-out scores.
Objective: mean of  AUC(known analogs rank above control cities)
                and AUC(known analogs rank above the unlabeled Earth grid).
Run after terratwin_model.py; rerun terratwin_model.py afterwards to apply the weights.
"""
import itertools
import json
import pathlib

import numpy as np

import terratwin_model as m

HERE = pathlib.Path(__file__).resolve().parent
STEP = 0.1


def simplex(n, step):
    k = round(1 / step)
    for c in itertools.product(range(k + 1), repeat=n - 1):
        if sum(c) <= k:
            yield [x * step for x in c] + [(k - sum(c)) * step]


def objective(d, pos, neg, bg):
    return 0.5 * m.auc(d[pos], d[neg]) + 0.5 * m.auc(d[pos], d[bg])


def fit(Dm, themes, pos, neg, bg):
    best, bw = -1, None
    for w in simplex(len(themes), STEP):
        d = m.overall({th: Dm[th][:, None] for th in themes}, dict(zip(themes, w)))[:, 0]
        s = objective(d, pos, neg, bg)
        if s > best + 1e-9:
            best, bw = s, w
    return dict(zip(themes, [round(x, 2) for x in bw])), best


def main():
    earth, targets = m.load()
    Xe, Xt, Ze, Zt, mu, sd = m.matrices(earth, targets)
    D = m.theme_distances(Ze, Zt)
    tb = [t["body"] for t in targets]
    sites = [i for i, e in enumerate(earth) if e["kind"] == "site"]
    bg = [i for i, e in enumerate(earth) if e["kind"] == "grid"]
    result = {"weights": {}, "report": {}}
    for body in ("mars", "moon"):
        cols = [j for j, b in enumerate(tb) if b == body]
        themes = [th for th in m.THEMES if not np.isnan(D[th][:, cols]).all()]
        Dm = {th: np.nanmean(D[th][:, cols], axis=1) for th in themes}
        pos = [i for i in sites if earth[i]["label"] == "analog" and body in earth[i]["analog_for"]]
        neg = [i for i in sites if earth[i]["label"] == "control"]
        w, score = fit(Dm, themes, pos, neg, bg)
        eq = objective(m.overall({th: Dm[th][:, None] for th in themes}, {th: 1 for th in themes})[:, 0], pos, neg, bg)
        # leave-one-analog-out: refit without one site, check where the held-out site ranks
        held = []
        for i in pos:
            wi, _ = fit(Dm, themes, [p for p in pos if p != i], neg, bg)
            d = m.overall({th: Dm[th][:, None] for th in themes}, wi)[:, 0]
            held.append(float(np.mean(d[i] < d[bg])))
        result["weights"][body] = {th: w.get(th, 0.0) for th in m.THEMES}
        result["report"][body] = {"objective_equal_weights": round(eq, 3), "objective_learned": round(score, 3),
                                  "leave_one_out_mean_rank_vs_grid": round(float(np.mean(held)), 3),
                                  "n_analogs": len(pos), "n_controls": len(neg)}
        print(body, "weights", result["weights"][body], result["report"][body])
    (HERE / "training").mkdir(exist_ok=True)
    (HERE / "training/learned_weights.json").write_text(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
