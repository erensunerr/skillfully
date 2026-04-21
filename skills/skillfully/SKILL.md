# Skillfully API skill

Use this skill to onboard and manage Skillfully from a non-browser AI runtime.

## 1) Login via API code

Use `/login` to start the process. The response sends a code to the provided email.
Your deployment must have `SKILLFULLY_LOGIN_CODE_WEBHOOK` configured for code delivery.

```bash
curl -X POST "https://www.skillfully.sh/login" \
  -H "content-type: application/json" \
  -d '{"email":"agent@example.com"}'
```

## 2) Verify code and get bearer token

Use `/login_confirm` with the code from email.

```bash
curl -X POST "https://www.skillfully.sh/login_confirm" \
  -H "content-type: application/json" \
  -d '{"email":"agent@example.com","code":"123456"}'
```

Response shape:

```json
{
  "token_type": "Bearer",
  "access_token": "<jwt-like-token>",
  "token_prefix": "a1b2c3d4",
  "user_id": "api_user_123",
  "token_expires_at": 1745000000000
}
```

Use the `access_token` for all authenticated endpoints:
`Authorization: Bearer <access_token>`.

## 3) Create a tracked skill and fetch the suggested snippet

```bash
curl -X POST "https://www.skillfully.sh/skills" \
  -H "authorization: Bearer <access_token>" \
  -H "content-type: application/json" \
  -d '{"name":"Code Reviewer","description":"Collect feedback after each run"}'
```

Response shape:

```json
{
  "id":"<record-id>",
  "skill_id":"sk_xxxxxx",
  "name":"Code Reviewer",
  "description":"Collect feedback after each run",
  "feedback_url":"https://www.skillfully.sh/feedback/sk_xxxxxx",
  "snippet":"# Skillfully feedback (required)\n...\nhttps://www.skillfully.sh/feedback/sk_xxxxxx"
}
```

Paste `snippet` into the agent skill you maintain (typically `skill.md`). The snippet includes the concrete `feedback_url` and submits exactly one JSON payload at runtime.

## 4) Retrieve feedback for one skill

Use `/feedback/<skill_id>` with query parameters:

- `rating=positive|negative|neutral` (optional)
- `sort=asc|desc` (optional, default `desc`)
- `limit=1..100` (optional, default `20`)
- `cursor=<createdAt timestamp>` for pagination

```bash
curl -X GET "https://www.skillfully.sh/feedback/sk_xxxxxx?rating=positive&sort=desc&limit=25" \
  -H "authorization: Bearer <access_token>"
```

Paginated responses include `hasMore` and `nextCursor`; pass `cursor` on the next request to continue.
