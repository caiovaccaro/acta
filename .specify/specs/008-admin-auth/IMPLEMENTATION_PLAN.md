# Admin Authentication - Implementation Plan

## Goals
- Require authentication for all `/admin` pages and `/admin/api` routes.
- Provide a login screen and session management.
- Register a single admin account via environment variables.

## Non-Goals
- Multi-user management
- Password reset flow
- OAuth / SSO

## Acceptance Criteria
- Visiting `/admin` without a session redirects to `/admin/login`
- Successful login sets a session cookie
- Session persists across reloads and API calls
- Logout clears the session
- Only a single admin account is supported

## Architecture
### Auth Strategy
- **Session cookie** stored as HttpOnly, Secure (prod), SameSite=Lax.
- **Server-side session store** using an in-memory map for now (simple + single admin).
  - OK for Vercel (stateless) only if using signed session token stored in cookie.
  - We will use signed token with HMAC so no server store required.

### Data / Config
- Admin credentials stored via env:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - `ADMIN_SESSION_SECRET`

### Routes
- `POST /admin/api/auth/login`
- `POST /admin/api/auth/logout`
- `GET /admin/api/auth/session`

### UI
- `apps/web/app/admin/login/page.tsx`
- Login form with email + password

### Guarding
- Middleware to protect `/admin` and `/admin/api/*` except `/admin/login` and auth endpoints.

## Implementation Steps
1. **Create auth utilities**
   - Hash/compare password (use bcryptjs)
   - Sign/verify session cookie with HMAC
2. **Create auth API routes**
   - login: validate, set cookie
   - logout: clear cookie
   - session: return session state
3. **Add login UI**
   - Simple form
   - Redirect to `/admin` on success
4. **Add middleware**
   - Protect `/admin` and `/admin/api`
   - Allow login route and auth endpoints
5. **Wire logout**
   - Add logout button in admin layout
6. **Docs**
   - Update README or admin docs with env vars

## Testing
### Unit
- Auth token sign/verify
- Login validation

### Integration
- Login sets cookie
- Auth guard blocks unauthenticated requests
- Logout clears cookie

### Manual
- Login → browse admin routes → logout → redirect to login

