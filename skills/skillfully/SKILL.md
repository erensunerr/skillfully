---
name: skillfully
description: Use Skillfully APIs from an AI runtime to authenticate as a skill author agent, edit skills, publish them, and retrieve feedback.
---

# Skillfully API skill

Use this skill to onboard and manage Skillfully from a non-browser AI runtime.

Set this once:

```bash
BASE_URL="https://www.skillfully.sh"
```

## 1) Start author-agent device auth

Call `POST /api/agent/auth/device`. Show the returned `user_code` or `verification_uri_complete` to the human skill author.

```bash
curl -X POST "$BASE_URL/api/agent/auth/device" \
  -H "content-type: application/json" \
  -d '{"agent_name":"Codex author agent"}'
```

Poll slowly using the returned `interval`.

```bash
curl -X POST "$BASE_URL/api/agent/auth/device/token" \
  -H "content-type: application/json" \
  -d '{"device_code":"<device_code>"}'
```

While the human has not approved the code, the response is `authorization_pending`.
After approval, the response includes an author token:

```json
{
  "token_type": "Bearer",
  "access_token": "<author-token>",
  "token_prefix": "a1b2c3d4",
  "owner_id": "instant-user-id",
  "scope": "skills:write",
  "token_expires_at": 1745000000000
}
```

Use `access_token` for every authenticated endpoint with:

```bash
Authorization: Bearer <access_token>
```

## 2) Create a full draft skill

Call `POST /api/agent/skills` with name and optional description. This creates the real Skillfully draft, default `SKILL.md`, version, and publishing targets.

```bash
curl -X POST "$BASE_URL/api/agent/skills" \
  -H "authorization: Bearer <access_token>" \
  -H "content-type: application/json" \
  -d '{"name":"Code Reviewer","description":"Reviews code changes before merge"}'
```

## 3) Edit skill files

List draft files:

```bash
curl "$BASE_URL/api/agent/skills/sk_xxxxxx/files" \
  -H "authorization: Bearer <access_token>"
```

Update a draft file:

```bash
curl -X PATCH "$BASE_URL/api/agent/skills/sk_xxxxxx/files/<file_id>" \
  -H "authorization: Bearer <access_token>" \
  -H "content-type: application/json" \
  -d '{"path":"SKILL.md","content_text":"# Code Reviewer\n\n## Workflow\n\n1. Inspect the diff."}'
```

Skillfully owns the feedback/update block. Do not write that block into editable content; Skillfully appends it to published `SKILL.md` files.

## 4) Publish

```bash
curl -X POST "$BASE_URL/api/agent/skills/sk_xxxxxx/publish" \
  -H "authorization: Bearer <access_token>"
```

Publishing writes to GitHub when configured and prepares manual directory packets for supported directories.

## 5) Retrieve analytics and feedback

Use the agent analytics endpoint for summary data:

```bash
curl "$BASE_URL/api/agent/skills/sk_xxxxxx/analytics" \
  -H "authorization: Bearer <access_token>"
```

The legacy feedback endpoint still returns raw feedback rows:

Call `GET /feedback/<skill_id>` with optional query filters:

- `rating=positive|negative|neutral` (optional)
- `sort=asc|desc` (optional, default `desc`)
- `limit=1..100` (optional, default `20`)
- `cursor=<createdAt:id>` (optional, required for stable pagination)

```bash
curl -X GET "$BASE_URL/feedback/sk_xxxxxx?rating=positive&sort=desc&limit=25" \
  -H "authorization: Bearer <access_token>"
```

Paginated responses include:

```json
{
  "items": [],
  "sort": "desc",
  "limit": 25,
  "rating": "positive",
  "cursor": null,
  "hasMore": true,
  "nextCursor": "1739999999000:feedback-record-id"
}
```

Use `nextCursor` as the `cursor` query arg for the next call:

```bash
curl -X GET "$BASE_URL/feedback/sk_xxxxxx?sort=desc&cursor=1739999999000:feedback-record-id" \
  -H "authorization: Bearer <access_token>"
```
