# Admin Authentication Feature

## Overview
Add authentication and session management to the admin area. Access to `/admin` routes should require login. A single admin account is registered with known credentials.

## Documentation
- **Implementation Plan**: [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)

## Quick Reference

### Feature Summary
- **Purpose**: Secure admin routes with login + session
- **Location**: `/admin/*`
- **User Flow**: Visit admin → login → session persists → logout

### Key Components
1. **Auth API**: login, logout, session check
2. **Session Store**: server-side session cookie
3. **Route Guard**: protect admin pages + admin API
4. **Login UI**: dedicated admin login page

### Acceptance Criteria
✅ Admin routes require authentication  
✅ Login page authenticates a single admin account  
✅ Sessions persist across requests and can be terminated via logout  
✅ Admin API routes are protected  
✅ Unauthorized users are redirected to login

