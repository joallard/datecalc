# Date Arithmetic Edge Cases

- `2024-02-29 + 1y = 2025-02-28` — Luxon clamps to valid date when target month is shorter
- Date subtraction isn't reversible: `2019-11-22 + 75m21d = 2026-03-15` but `2026-03-15 - 75m21d = 2019-11-24`
