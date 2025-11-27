# Section Filtering Specification

**Feature**: RSS Feed Section Filtering  
**Created**: 2025-01-27  
**Status**: Implemented

## Overview

This specification defines the implementation of section filtering for RSS feeds, allowing the crawler to only fetch articles from relevant sections that match Acta's core topics: war & accountability, drug policy & violence, and AI regulation vs innovation.

## Requirements

### Functional Requirements

#### FR-001: Section Mapping
- **FR-001.1**: System MUST map outlet-specific section names to standard Acta categories
- **FR-001.2**: System MUST support mapping via RSS category tags
- **FR-001.3**: System MUST support mapping via URL path segments
- **FR-001.4**: System MUST support fuzzy matching for similar section names

#### FR-002: Section Filtering
- **FR-002.1**: System MUST filter articles by allowed sections per outlet
- **FR-002.2**: System MUST check RSS category tags first
- **FR-002.3**: System MUST fallback to URL path analysis if no category tags
- **FR-002.4**: System MUST log filtered articles for transparency
- **FR-002.5**: System MUST allow empty sectionsAllowed (no filtering)

#### FR-003: Standard Categories
- **FR-003.1**: System MUST support standard categories:
  - `world`: World / International news
  - `politics`: Politics / Geopolitics
  - `socioeconomic`: Socioeconomic policy
  - `technology`: Technology & Innovation
  - `regulation`: Regulation / Law / Accountability
  - `humanitarian`: Humanitarian / Conflict
  - `environment`: Environment & Sustainability (optional)

## Implementation

### Section Mapping System

**File**: `apps/crawler/src/config/sectionMapping.js`

- **Standard Sections**: Defines canonical section names and aliases
- **Outlet Mappings**: Maps outlet-specific names to standard categories
- **URL Path Extraction**: Extracts section from URL paths
- **Matching Logic**: Checks category tags and URL paths

### Outlet Configuration

Each outlet in `outlets.json` can specify:

```json
{
  "sectionsAllowed": ["world", "politics", "socioeconomic", "technology", "regulation", "humanitarian"]
}
```

If `sectionsAllowed` is empty or not specified, no filtering is applied.

### RSS Extraction

**File**: `apps/crawler/src/rss/extractors.js`

- Extracts `<category>` tags from RSS 2.0 feeds
- Extracts `<category term="...">` from Atom feeds
- Returns categories array with article data

### Filtering Logic

**File**: `apps/crawler/src/rss/handler.js`

1. Extract categories from RSS item
2. Check if article matches allowed sections:
   - Try category tag mapping first
   - Fallback to URL path analysis
   - Use fuzzy matching if needed
3. Skip article if no match
4. Log filtered articles for monitoring

## Outlet-Specific Mappings

### The Guardian
- Category tags: `world`, `politics`, `technology`, `business`, `law`
- URL paths: `/world/`, `/politics/`, `/technology/`, `/business/`

### Al Jazeera English
- Category tags: `world`, `international`, `politics`, `technology`
- URL paths: `/news/`, `/programmes/`

### BBC
- Category tags: `world`, `world news`, `politics`, `technology`
- URL paths: `/news/world/`, `/news/politics/`, `/news/technology/`

### Reuters
- Category tags: `world news`, `politics`, `technology`, `business`
- URL paths: `/world/`, `/politics/`, `/technology/`, `/business/`

### Wall Street Journal
- Category tags: `world news`, `politics`, `technology`, `business`
- URL paths: `/world/`, `/politics/`, `/technology/`, `/business/`

### The Telegraph
- Category tags: `world`, `world news`, `politics`, `technology`
- URL paths: `/news/world/`, `/news/politics/`, `/technology/`

## Usage

### Configuration

Add `sectionsAllowed` to outlet config:

```json
{
  "name": "The Guardian",
  "sectionsAllowed": ["world", "politics", "technology", "regulation"]
}
```

### Monitoring

The crawler logs:
- Total articles found in feed
- Articles filtered by section
- Articles processed
- Section matching details (for debugging)

### Disabling Filtering

To disable section filtering for an outlet:
- Omit `sectionsAllowed` field, or
- Set `sectionsAllowed: []`

## Examples

### Example 1: Filtered Article

**RSS Item**:
```xml
<item>
  <title>Tech Company Launches New AI Product</title>
  <link>https://example.com/technology/ai-product</link>
  <category>Technology</category>
</item>
```

**Outlet Config**: `"sectionsAllowed": ["technology"]`

**Result**: ✅ Article processed (matches "technology")

### Example 2: Filtered Out Article

**RSS Item**:
```xml
<item>
  <title>Sports Team Wins Championship</title>
  <link>https://example.com/sports/championship</link>
  <category>Sports</category>
</item>
```

**Outlet Config**: `"sectionsAllowed": ["world", "politics"]`

**Result**: ❌ Article skipped (doesn't match allowed sections)

### Example 3: URL Path Matching

**RSS Item**:
```xml
<item>
  <title>World News Article</title>
  <link>https://example.com/news/world/conflict</link>
</item>
```

**Outlet Config**: `"sectionsAllowed": ["world"]`

**Result**: ✅ Article processed (URL path `/news/world/` matches "world")

## Testing

To test section filtering:

1. **Enable debug logging** to see filtered articles
2. **Check logs** for "Skipping article - section not allowed" messages
3. **Verify counts**: processedCount + filteredCount should equal total articles
4. **Test edge cases**: articles with no categories, malformed URLs

## Implementation Status

**Date**: 2025-01-27  
**Status**: Implemented

### Changes Made

1. **Created Section Mapping System** (`apps/crawler/src/config/sectionMapping.js`):
   - Maps outlet-specific section names to 7 standard categories
   - Supports category tag mapping (RSS `<category>` tags)
   - Supports URL path mapping (from article URLs)
   - Fuzzy matching for variations

2. **Updated RSS Extractors**: Extracts category tags from RSS 2.0 and Atom feeds

3. **Updated RSS Handler**: Filters articles by `sectionsAllowed` configuration, checks category tags first, falls back to URL path analysis

4. **Updated Outlet Configuration**: Added `sectionsAllowed` to all 6 outlets with relevant sections

5. **Updated Article Crawler**: Passes section configuration to RSS handler

### Current Configuration

All pilot outlets are configured with:
```json
"sectionsAllowed": ["world", "politics", "socioeconomic", "technology", "regulation", "humanitarian"]
```

This ensures only articles from sections relevant to Acta's core topics are processed.

## Future Enhancements

- [ ] Machine learning-based section classification
- [ ] Automatic section name discovery
- [ ] Per-outlet section name learning
- [ ] Section confidence scoring
- [ ] Manual section override for edge cases

