# Paywall Integration Specification

**Feature**: Paywalled Publication Support  
**Created**: 2025-01-27  
**Status**: Draft  
**Related**: `PAID_OUTLETS.md` (reference spec)

## Overview

This specification defines the implementation of paywall support for RSS-driven article crawling. The system must handle authenticated access to paywalled publications while maintaining legal compliance, security, and reliability.

## Requirements

### Functional Requirements

#### FR-001: Outlet Configuration
- **FR-001.1**: System MUST support paywall configuration per outlet
- **FR-001.2**: System MUST support paywall types: `None`, `Soft`, `Hard`
- **FR-001.3**: System MUST support authentication types: `form`, `basic`, `api-token`, `oauth`
- **FR-001.4**: System MUST store credentials securely (environment variables, never in code)
- **FR-001.5**: System MUST support optional reader endpoints (AMP, print views) for cleaner content
- **FR-001.6**: System MUST configure rate limits per outlet

#### FR-002: Authentication & Session Management
- **FR-002.1**: System MUST store credentials in `.env` file (local) or secrets manager (production)
- **FR-002.2**: System MUST never log credentials or raw cookies
- **FR-002.3**: System MUST maintain session store per outlet (encrypted at rest)
- **FR-002.4**: System MUST support manual cookie import for MFA-protected sites
- **FR-002.5**: System MUST monitor session expiry and refresh before expiry
- **FR-002.6**: System MUST handle re-login on 401/403/paywall detection

#### FR-003: Crawler Selection
- **FR-003.1**: System MUST use `PlaywrightCrawler` for paywalled or JS-heavy sites
- **FR-003.2**: System MUST use `CheerioCrawler` for non-paywalled, simple sites
- **FR-003.3**: System MUST enable SessionPool for authenticated outlets
- **FR-003.4**: System MUST respect outlet rate limits with jitter
- **FR-003.5**: System MUST keep concurrency low for paywalled domains

#### FR-004: Fetch Strategy
- **FR-004.1**: System MUST prioritize official subscriber APIs when available
- **FR-004.2**: System MUST attempt reader/AMP/print views for cleaner DOM
- **FR-004.3**: System MUST fallback to standard article URL
- **FR-004.4**: System MUST attach authenticated session (cookies/headers) to requests
- **FR-004.5**: System MUST detect paywall states and re-login once if needed

#### FR-005: RSS Feed Handling
- **FR-005.1**: System MUST prefer subscriber RSS feeds (token/cookie-based) when available
- **FR-005.2**: System MUST use RSS for discovery when full text not included
- **FR-005.3**: System MUST canonicalize URLs to avoid duplicates
- **FR-005.4**: System MUST defer full-text fetch to authenticated crawler step

#### FR-006: Data Handling & Compliance
- **FR-006.1**: System MUST respect outlet Terms of Service/licenses
- **FR-006.2**: System MUST store: title, byline, publishedAt, short excerpt (lede), canonicalUrl, outletId
- **FR-006.3**: System MUST always store source URL and citation metadata
- **FR-006.4**: System MUST respect robots/noarchive signals
- **FR-006.5**: System MUST keep excerpts short unless license explicitly allows full text

#### FR-007: Error Handling & Observability
- **FR-007.1**: System MUST tag failures: `auth_failed`, `paywall_block`, `parse_error`, `rate_limited`
- **FR-007.2**: System MUST log per-outlet metrics: login success %, article success %, latency, 401/403/429 rates
- **FR-007.3**: System MUST provide manual "Refresh Session" operation per outlet
- **FR-007.4**: System MUST implement exponential backoff on 429/5xx errors

## Implementation Approach

### Phase 1: Configuration & Database

1. **Update Outlet Model** (if exists) or create outlet configuration:
   - `requiresAuth: boolean`
   - `authType: 'form' | 'basic' | 'api-token' | 'oauth' | 'paywall-soft' | 'paywall-hard'`
   - `paywallType: 'None' | 'Soft' | 'Hard'`
   - `loginUrl?: string`
   - `apiBase?: string`
   - `readerEndpoint?: string`
   - `rateLimit: { maxRPS: number, jitterMs: number }`
   - `contentPolicy: 'excerpt-only' | 'full-text-licensed' | 'meta-only'`

2. **Environment Variables**:
   - `OUTLET_WSJ_LOGIN` (for Wall Street Journal)
   - `OUTLET_WSJ_PASSWORD`
   - `OUTLET_TELEGRAPH_LOGIN` (for The Telegraph)
   - `OUTLET_TELEGRAPH_PASSWORD`
   - Pattern: `OUTLET_{OUTLET_NAME}_LOGIN` and `OUTLET_{OUTLET_NAME}_PASSWORD`

3. **Update outlets.json**:
   - Replace with new outlet list
   - Add paywall configuration per outlet
   - Add ideology field
   - Mark pilot outlets

### Phase 2: Session Management

1. **Create Session Store**:
   - `apps/crawler/src/auth/sessionStore.js`
   - Encrypted cookie storage per outlet
   - Session expiry tracking
   - Refresh logic

2. **Create Authentication Service**:
   - `apps/crawler/src/auth/authenticator.js`
   - Handle different auth types (form, basic, etc.)
   - Login flow with retry logic
   - Cookie extraction and storage

### Phase 3: Crawler Refactoring

1. **Create Crawler Factory**:
   - `apps/crawler/src/crawlers/crawlerFactory.js`
   - Select CheerioCrawler or PlaywrightCrawler based on outlet config
   - Configure SessionPool for authenticated outlets
   - Set rate limits and concurrency

2. **Update RSS Handler**:
   - Support authenticated RSS feeds
   - Handle subscriber RSS endpoints
   - Canonicalize URLs

3. **Update Article Crawler**:
   - Use PlaywrightCrawler for paywalled articles
   - Attempt reader/AMP/print views first
   - Fallback to standard URL
   - Handle paywall detection

### Phase 4: Error Handling & Monitoring

1. **Error Tagging**:
   - Tag failures by type
   - Store in database with error metadata

2. **Metrics Collection**:
   - Per-outlet success rates
   - Authentication success rates
   - Latency tracking
   - Error rate tracking

3. **Manual Operations**:
   - Refresh session endpoint/command
   - Cookie import utility

## Data Model

### Outlet Configuration (JSON/DB)

```typescript
interface OutletConfig {
  name: string;
  ideology: 'Left' | 'Center' | 'Right';
  rssUrl: string;
  paywallType: 'None' | 'Soft' | 'Hard';
  isPilot: boolean;
  requiresAuth: boolean;
  authType?: 'form' | 'basic' | 'api-token' | 'oauth';
  loginUrl?: string;
  apiBase?: string;
  readerEndpoint?: string;
  ampParam?: string;
  printParam?: string;
  contentPolicy: 'excerpt-only' | 'full-text-licensed' | 'meta-only';
  rateLimit: {
    maxRPS: number;
    jitterMs: number;
  };
}
```

## Security Considerations

1. **Credential Storage**:
   - Never commit credentials to git
   - Use `.env` file (local) or AWS Secrets Manager (production)
   - Encrypt session storage

2. **Logging**:
   - Mask sensitive headers in logs
   - Never log passwords or raw cookies
   - Scrub PII from logs

3. **Environment Isolation**:
   - Separate dev vs prod sessions
   - Do not reuse personal cookies in shared prod

## Acceptance Criteria

- ✅ Authenticated fetch succeeds for at least 1 paid URL per outlet during smoke tests
- ✅ >90% article success rate per paywalled outlet over 7-day rolling window
- ✅ No repeated `auth_failed` spikes; sessions auto-refresh within policy
- ✅ Stored data complies with outlet ToS (excerpts + links unless licensed otherwise)
- ✅ Every stored item has resolvable source URL and outlet record

## Implementation Tasks

1. ✅ Update outlets.json with new feeds and paywall config
2. ✅ Create environment variable structure for credentials
3. ✅ Implement session store for authenticated outlets
4. ✅ Create authenticator service for different auth types
5. ✅ Create crawler factory (Cheerio vs Playwright selection)
6. ✅ Update RSS handler for authenticated feeds
7. ✅ Update article crawler for paywalled content
8. ✅ Implement error tagging and monitoring
9. ✅ Add manual session refresh utilities
10. ⏳ Create integration tests for paywalled outlets

## Implementation Status

**Date**: 2025-01-27  
**Status**: Implemented

### Changes Made

1. **Updated Outlet Configuration**: Replaced old RSS feeds with 6 real outlets (4 non-paywalled, 2 paywalled)
2. **Created Authentication System**: Session store with encrypted cookies, authenticator service with form-based login
3. **Created Crawler Factory**: Smart selection between CheerioCrawler and PlaywrightCrawler based on outlet config
4. **Updated Main Crawler**: Processes outlets individually with appropriate crawler, handles authenticated RSS feeds
5. **Updated Article Crawler**: Dual router support, paywall detection, fallback URLs, content policy handling
6. **Error Handling**: Comprehensive error tagging, logging, and monitoring (see Error Handling section below)
7. **Environment Setup**: `.env` file structure with credentials

### Environment Setup

Create `apps/crawler/.env` file with credentials:

```bash
# Wall Street Journal
OUTLET_WSJ_LOGIN=feliphelavor@hotmail.com
OUTLET_WSJ_PASSWORD=!rHtU4Ne5DBzXZ*

# The Telegraph
OUTLET_TELEGRAPH_LOGIN=feliphelavor@hotmail.com
OUTLET_TELEGRAPH_PASSWORD=XBWviq2kxPvkSkp

# Session Encryption Key (change in production)
SESSION_ENCRYPTION_KEY=dev-key-change-in-production
```

### Error Handling & Monitoring

The system implements comprehensive error handling:

- **Error Tagging**: All failures tagged with type (`auth_failed`, `paywall_block`, `parse_error`, `rate_limited`)
- **Per-Outlet Metrics**: Login success %, article success %, latency, 401/403/429 rates
- **Exponential Backoff**: Automatic retry with backoff on 429/5xx errors
- **Session Refresh**: Automatic session refresh on auth failures
- **Logging**: All errors logged with context (never logs credentials)

See `apps/crawler/src/auth/errorHandler.js` for implementation details.

