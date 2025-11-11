# RSS News Crawler - POC Summary

A proof-of-concept web crawler that extracts news articles from RSS feeds using an event-driven, decoupled architecture. The system processes RSS feeds and then extracts full article content using Mozilla Readability with a fallback parser.

## Overview

This POC demonstrates a scalable news aggregation system that:
- Discovers and processes RSS feeds from multiple news sources
- Extracts structured metadata from RSS feeds
- Fetches and parses full article content using Mozilla Readability
- Stores data in a structured format with deduplication
- Exports data in CSV and JSON formats

## Architecture

### Event-Driven, Decoupled Design

The system is built with a two-phase, event-driven architecture:

**Phase 1: RSS Feed Processing**
- Processes RSS/Atom feeds from verified sources
- Extracts article metadata (title, link, description, publication date)
- Saves RSS metadata to dataset
- Queues articles for full content extraction (decoupled)

**Phase 2: Article Content Extraction**
- Triggered after Phase 1 completes
- Fetches individual article pages
- Extracts full article content using Mozilla Readability
- Falls back to generic HTML parsing if Readability fails
- Combines RSS metadata with extracted content
- Saves complete article data

### Key Features

- **Decoupled Processing**: RSS processing and article extraction are independent phases
- **Deduplication**: Prevents processing the same article multiple times
- **Agnostic Parser**: Uses Mozilla Readability with fallback to generic HTML parsing
- **Structured Data**: Consistent schema based on Mozilla Readability format
- **Persistent Storage**: Data persists across crawler runs
- **Export Tools**: Separate exports for RSS metadata and full articles

## Project Structure

```
my-crawler/
├── src/
│   ├── main.js              # Main entry point, orchestrates phases
│   ├── routes.js            # Crawlee router handlers
│   ├── parsers.js           # Article parsing (Readability + fallback)
│   ├── schemas/
│   │   └── article.js       # Article data schema and normalization
│   └── utils/
│       ├── index.js         # Barrel export for utilities
│       ├── storage.js       # Deduplication and pending queue management
│       ├── rss-handler.js   # RSS feed processing logic
│       ├── rss-extractors.js # RSS/Atom item extraction
│       ├── article-handler.js # Article processing and data combination
│       └── enqueue.js       # Article queue management
├── export-rss.js            # Export RSS metadata to CSV/JSON
├── export-articles.js       # Export full articles to CSV/JSON
├── verified-rss-feeds.json  # List of verified RSS feed URLs
└── storage/                 # Crawlee storage (datasets, queues, etc.)
```

## Installation

1. **Prerequisites**: Node.js 18+ (tested with Node 24.11.0)

2. **Install dependencies**:
```bash
npm install
```

## Configuration

### RSS Feeds

Edit `verified-rss-feeds.json` to add or modify RSS feed sources:

```json
{
  "validFeeds": [
    {
      "url": "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
      "source": "The New York Times"
    },
    {
      "url": "https://www.theguardian.com/world/rss",
      "source": "The Guardian"
    }
  ]
}
```

## Usage

### Running the Crawler

```bash
npm start
```

This will:
1. Process all RSS feeds from `verified-rss-feeds.json`
2. Extract article metadata and save to dataset
3. Queue articles for content extraction
4. Process queued articles and extract full content
5. Save complete article data to dataset

### Exporting Data

**Export RSS metadata only**:
```bash
npm run export:rss
```
Outputs: `rss-export.csv` and `rss-export.json`

**Export full articles**:
```bash
npm run export:articles
```
Outputs: `articles-export.csv` and `articles-export.json`

## Data Schema

### RSS Metadata (Phase 1)
- `source`: News source name
- `feedUrl`: RSS feed URL
- `title`: Article title from RSS
- `link`: Article URL
- `description`: Article description/summary from RSS
- `pubDate`: Publication date from RSS

### Full Article Data (Phase 2)
Includes all RSS metadata plus:
- `textContent`: Plain text article content
- `excerpt`: Article excerpt
- `byline`: Author name(s)
- `author`: Author name (alternative)
- `dir`: Text direction (ltr/rtl)
- `lang`: Language code
- `length`: Word count
- `siteName`: Publication/site name
- `publishedTime`: ISO 8601 publication date
- `modifiedTime`: ISO 8601 last modified date
- `image`: Featured image URL
- `tags`: Article tags/categories (array)
- `articleUrl`: Full article URL
- `extractedAt`: Timestamp when article was extracted

## Technical Details

### Parsing Strategy

1. **Primary**: Mozilla Readability
   - Extracts main article content
   - Removes navigation, ads, and other clutter
   - Provides structured metadata

2. **Fallback**: Generic HTML Parser
   - Uses common article selectors
   - Extracts from meta tags
   - Provides basic content extraction when Readability fails

### Deduplication

- Uses Crawlee's `KeyValueStore` to track processed article URLs
- Prevents re-processing articles across multiple runs
- Articles are marked as processed only after full content extraction

### Storage

- Data stored in `storage/datasets/default/` (one JSON file per article)
- Request queue in `storage/request_queues/default/`
- Deduplication state in `storage/key_value_stores/default/`

## Limitations & Future Improvements

### Current Limitations
- Limited to verified RSS feeds (manual configuration)
- No automatic RSS feed discovery
- Single-threaded processing (Crawlee handles concurrency)
- No rate limiting or polite crawling delays

### Potential Enhancements
- Server-based task scheduling (architecture is ready)
- Automatic RSS feed discovery from website homepages
- Support for additional content types (videos, podcasts)
- Database storage instead of file-based
- API endpoints for querying extracted data
- Real-time processing with webhooks
- Content analysis and categorization

## Dependencies

- **crawlee**: Web scraping and crawling framework
- **@mozilla/readability**: Article content extraction
- **jsdom**: DOM implementation for Readability
- **cheerio**: Server-side jQuery implementation for HTML parsing

## License

ISC
