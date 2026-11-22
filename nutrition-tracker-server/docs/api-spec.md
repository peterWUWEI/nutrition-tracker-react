# API spec: Foods and Meals

**Status:** specified by the tests in `src/routes/foods.test.ts` and `src/routes/meals.test.ts`. If this document and the tests disagree, the tests win.

- Foods (features 1–4) and Meals (features 5–7): implemented; all spec tests pass.

## Conventions

- JSON fields are camelCase (`energyInKcal`). Database columns are snake_case (`energy_in_kcal`).
- Errors look like `{ "error": "message" }`, and the message names the field or value that's wrong.
- Status codes: `400` invalid input, `403` meal locked, `404` not found, `409` conflict, `413` picture too large.
- There's a single user and no authentication.

## Food

| Field | Type | Required | Rules | Column |
| --- | --- | --- | --- | --- |
| `id` | integer | auto | Auto-increments; can never be changed | `id` |
| `name` | string | yes | Trimmed, not empty, unique ignoring letter case | `name` |
| `type` | `"food"` or `"beverage"` | yes | | `type` |
| `servingSize` | number | yes | > 0 | `serving_size` |
| `servingUnit` | `"gram"` or `"ml"` | yes | `gram` for food, `ml` for beverage | `serving_unit` |
| `servingsPerPackage` | number | no | > 0 | `servings_per_package` |
| `energyInKcal` | number | yes | ≥ 0 | `energy_in_kcal` |
| `proteinInGram` | number | yes | ≥ 0 | `protein_in_gram` |
| `carbsInGram` | number | yes | ≥ 0 | `carbs_in_gram` |
| `fatInGram` | number | yes | ≥ 0 | `fat_in_gram` |
| `sodiumInMg` | number | no | ≥ 0 | `sodium_in_mg` |
| `cholesterolInMg` | number | no | ≥ 0 | `cholesterol_in_mg` |
| `dietaryFibreInGram` | number | no | ≥ 0 | `dietary_fibre_in_gram` |
| `brand` | string | no | | `brand` |
| `picture` → `pictureUrl` | image file | yes | JPEG, PNG or WebP, checked by the file's content (not its name); max 5 MB | file path |

All nutrition values are **per serving**. Optional fields are `null` in responses when not set. Responses also include `createdAt` and `updatedAt`.

### Endpoints

| Method and path | Body | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/foods` | `multipart/form-data`: the fields above + `picture` file | `201` food | `400` invalid/missing field or picture, `409` name taken, `413` picture > 5 MB |
| `GET /api/foods?page=1&pageSize=10&search=yog` | | `200` `{ data: Food[], pagination: { page, pageSize, totalItems, totalPages } }` | `400` page < 1, pageSize outside 1–100, or not a number |
| `GET /api/foods/:id` | | `200` food | `400` id not a number, `404` |
| `PATCH /api/foods/:id` | JSON with any fields except `id` (`null` clears an optional field), or `multipart/form-data` to replace the picture | `200` updated food | `400` id included / invalid value / empty update / type and unit don't match, `404`, `409` name taken |
| `DELETE /api/foods/:id` | | `204` | `404`, `409` food is used in a meal |
| `DELETE /api/foods?name=Apple` | | `204` (name matched ignoring case) | `400` no name given, `404`, `409` food is used in a meal |

Listing: sorted by name. Defaults are `page=1` and `pageSize=10`. `search` matches any part of the name, ignoring case, and `totalItems` counts only the matches. A page past the end returns an empty `data` list.

Pictures are saved under `UPLOADS_DIR` (default `uploads/` in the server folder) and served by the API at `pictureUrl` (e.g. `/uploads/foods/<file>.png`). Tests use a temporary folder.

## Meal

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `id` | integer | auto | Can never be changed |
| `title` | `"breakfast"`, `"lunch"`, `"dinner"`, `"snacks"`, `"others"` | yes | |
| `eatenAt` | ISO date-time | no | Defaults to now; can be in the past, never in the future |
| `items` | `[{ foodId, quantityConsumed }]` | yes | At least one item; each food only once; food must exist |
| `items[].quantityConsumed` | number | yes | > 0, number of **servings** (1.5 = one and a half servings) |

Responses add:

- `items[].food`: the full food
- `editable`: `true` while less than 48 hours have passed since `eatenAt`
- `createdAt` and `updatedAt`

### Endpoints

| Method and path | Body | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/meals` | JSON `{ title, eatenAt?, items }` | `201` meal | `400` |
| `GET /api/meals?date=2026-01-15&timezone=Asia/Singapore` | | `200` meals eaten on that calendar date, earliest first (`[]` if none) | `400` missing/invalid date or unknown timezone |
| `PATCH /api/meals/:id` | JSON with any of `title`, `eatenAt`, `items` (`items` replaces the whole list) | `200` updated meal | `400` invalid / empty update / `id` included, `403` more than 48 h after `eatenAt`, `404` |
| `DELETE /api/meals/:id` | | `204` (foods are kept) | `403` more than 48 h after `eatenAt`, `404` |

`timezone` is an IANA name and defaults to `UTC`. It decides which calendar day a meal falls on: 23:30 UTC on Jan 15 is Jan 16 in Singapore.

## Decisions

- `amount_per_serving` from the requirements means **servings per package**, so it's named `servingsPerPackage`.
- `fat` is named `fatInGram` to match the other nutrient fields.
- A food that's part of any meal can't be deleted (`409`), so meal history stays complete.
- A meal must contain at least one food.
- Meals can be logged after the fact. A meal logged more than 48 hours after it was eaten is locked straight away.
- Meals reference foods rather than copying their values, so editing a food's nutrition also changes how past meals add up.
