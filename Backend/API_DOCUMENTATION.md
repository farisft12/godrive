# GoDrive API Documentation

Base URL: `http://localhost:3000` (or your `PORT`)

All authenticated endpoints require header: `Authorization: Bearer <token>`

---

## Authentication

### POST /api/auth/register
Register a new user.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "storage_quota": 1099511627776
}
```
- `storage_quota` optional (bytes). Default 1 GB. Example: 1 TB = 1099511627776

**Response:** `201` – `{ user, token }`

---

### POST /api/auth/login
Login.

**Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:** `200` – `{ user, token }`

---

### GET /api/auth/me
Current user (requires auth).

**Response:** `200` – `{ id, name, email, storage_quota, storage_used, created_at, updated_at }`

---

### POST /api/auth/logout
Logout (requires auth). Client should discard token.

**Response:** `200` – `{ message: "Logged out successfully" }`

---

## Users

### GET /api/users/profile
Profile (requires auth).

**Response:** `200` – user object

### GET /api/users/activity?limit=50
Activity log (requires auth).

**Response:** `200` – `{ activities: [...] }`

---

## Folders

### GET /api/folders?parent_id=<uuid>
List folders (root if `parent_id` omitted). Requires auth.

**Response:** `200` – `{ folders: [...] }`

### POST /api/folders
Create folder. Requires auth.

**Body:**
```json
{
  "name": "My Folder",
  "parent_id": "uuid-or-null"
}
```

**Response:** `201` – folder object

### PUT /api/folders/:id
Rename or move folder. Requires auth.

**Body:** `{ "name": "...", "parent_id": "uuid-or-null" }`

**Response:** `200` – folder object

### DELETE /api/folders/:id
Delete folder and its contents. Requires auth.

**Response:** `204`

---

## Files

### POST /api/files/upload
Upload file. Requires auth. Use `multipart/form-data` with field `file`. Optional: `folder_id`.

**Response:** `201` – file object

### GET /api/files?folder_id=<uuid>&trashed=true|false
List files in folder (root if `folder_id` omitted). `trashed=true` lists trashed files. Requires auth.

**Response:** `200` – `{ files: [...] }`

### GET /api/files/:id
Get file metadata. Requires auth.

**Response:** `200` – file object (no internal blob path)

### GET /api/files/:id/download
Download file. Requires auth.

**Response:** `200` – file stream with `Content-Disposition: attachment`

### PUT /api/files/:id/rename
Rename file. Requires auth.

**Body:** `{ "original_name": "new-name.txt" }`

**Response:** `200` – file object

### PUT /api/files/:id/move
Move file to another folder. Requires auth.

**Body:** `{ "folder_id": "uuid-or-null" }`

**Response:** `200` – file object

### POST /api/files/:id/trash
Move file to trash (soft delete). Requires auth.

**Response:** `200` – `{ message: "Moved to trash" }`

### POST /api/files/:id/restore
Restore from trash. Requires auth.

**Response:** `200` – file object

### DELETE /api/files/:id
Permanent delete. Requires auth.

**Response:** `204`

---

## Streaming (Video HLS)

### GET /api/stream/:fileId/playlist.m3u8
HLS playlist for video. Requires auth (owner only).

**Response:** `200` – m3u8 content

### GET /api/stream/:fileId/:segment
HLS segment (e.g. `.ts`). Requires auth.

**Response:** `200` – segment file

---

## Share

### POST /api/share/create
Create share link. Requires auth.

**Body:**
```json
{
  "file_id": "uuid",
  "password": "optional-password",
  "expires_at": "2025-12-31T23:59:59Z"
}
```

**Response:** `201` – `{ id, token, expires_at, message }`

### GET /api/share/:token?password=xxx
Get share metadata (no auth). If share has password, `password` query required.

**Response:** `200` – `{ file_id, original_name, mime_type, size_bytes }`

### GET /api/share/:token/download?password=xxx
Download file via share link (no auth). Password in query if set.

**Response:** `200` – file stream

---

## Search

### GET /api/search?q=query
Search files and folders by name/extension. Requires auth.

**Response:** `200` – `{ files: [...], folders: [...] }`

---

## System

### GET /api/system/storage
Disk usage for storage volume. Requires auth.

**Response:** `200` – `{ total, used, free, usage_percent, warning, warning_threshold_percent }`

- If `usage_percent` ≥ 85%, `warning` is true and server logs a warning.

---

## Health

### GET /health
No auth.

**Response:** `200` – `{ status: "ok" }`

---

## Errors

- `400` – Validation error (e.g. `{ errors: [...] }`)
- `401` – Missing or invalid token
- `403` – Forbidden (e.g. quota exceeded)
- `404` – Resource not found
- `413` – File too large (upload limit)
- `500` – Internal server error
