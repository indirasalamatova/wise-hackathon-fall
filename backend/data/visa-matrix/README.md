# Indicative visa matrix

`passport-index-tidy-iso2.csv` is a snapshot of the
[Passport Index dataset](https://github.com/ilyankou/passport-index-dataset) by Ilya Ilyankou
(MIT licence), file last changed in upstream commit `a46dbc8720` on **2025-01-12**.

One row per passport and destination (ISO alpha-2). `Requirement` is a number of visa-free days,
`visa free`, `visa on arrival`, `e-visa`, `eta`, `visa required`, `no admission`, or `-1` for the
passport's own country.

It describes short tourist visits only and is **not checked by Unbound**. The explore map shows it as
"indicative" with this source and date. A verified entry in `country_guidelines` with an
`entry_type` overrides it.

It loads automatically on first start. To update: replace the CSV, set `SOURCE["as_of"]` in
`app/services/visa_matrix.py`, then run `python -m app.cli.import_visa_matrix`.
