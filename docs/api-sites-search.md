# Site Search Endpoint

`GET /api/sites/search` — fuzzy search over the authenticated user's sites by name.

---

## Request

### Authentication

Requires a valid session or Bearer API key (same as all other API routes). Returns `401` if unauthenticated.

### Query Parameters

| Parameter | Required | Type | Constraints | Default | Description |
|-----------|----------|------|-------------|---------|-------------|
| `q` | Yes | string | 1–100 chars | — | Search query matched against site name |
| `limit` | No | integer | 1–25 | `10` | Maximum number of results to return |

### Example

```
GET /api/sites/search?q=blog&limit=5
Authorization: Bearer <api-key>
```

---

## Response

### 200 OK

```json
{
  "results": [
    { "id": "clx...", "name": "My Blog", "url": "https://myblog.com" },
    { "id": "clx...", "name": "Blog Staging", "url": "https://staging.myblog.com" }
  ]
}
```

Results are ordered by relevance (fuse.js score). Only `id`, `name`, and `url` are returned — no monitor or run data is included.

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | `q` is missing, empty, or exceeds 100 chars; `limit` is out of range |
| `401` | Unauthenticated request |
| `500` | Unexpected server error |

---

## Implementation Details

**File:** `src/app/api/sites/search/route.ts`

**Search strategy:** In-memory fuzzy search using [fuse.js](https://www.fusejs.io/) (`threshold: 0.4`) over the user's sites fetched from the database. Because `MAX_SITES_PER_USER = 25`, the DB fetch is a single index scan (`@@index([userId])`) over at most 25 rows, and the fuzzy logic runs over at most 25 strings — negligible CPU cost. No additional DB index or full-text extension is required.

**Why not `ILIKE`:** A Postgres `ILIKE '%query%'` would only match substrings. Fuzzy matching catches typos and partial matches (e.g. `"blg"` still matches `"My Blog"`), which is better suited for autocomplete UX.

**Projection:** The query uses `select: { id, name, url }` — monitor and run data are never loaded, keeping the response lean.
