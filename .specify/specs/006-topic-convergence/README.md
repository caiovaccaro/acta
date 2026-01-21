# Topic Convergence Feature

## Overview
Manual topic convergence feature in the admin panel that allows admins to select multiple topics and merge them into a single unified topic.

## Documentation

- **Implementation Plan**: [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) - Detailed development plan with phases, technical specifications, and testing strategy

## Quick Reference

### Feature Summary
- **Purpose**: Merge multiple topics into one to reduce duplication and improve data organization
- **Location**: Admin panel → Topics page
- **User Flow**: Select 2+ topics → Click "Converge Topics" → Choose target → Confirm → Execute

### Key Components
1. **Database Layer**: Repository function with transaction handling
2. **API Layer**: `/admin/api/topics/converge` endpoint
3. **Frontend**: Convergence modal component in topics page

### Relationships Handled
- Questions (one-to-many)
- TopicArticles (many-to-many, with duplicate handling)
- TimelineEvents (one-to-many)

### Estimated Complexity
~2-3 days of development



