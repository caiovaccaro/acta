# Featured Topics Ordering

## Overview
Implement topic-level featuring and ordering so admins can curate homepage topics exactly like featured questions are curated today. Featured topics should appear on the homepage above Featured Debates, in admin-defined order, and each card should link to the topic page.

## Documentation

- **Implementation Plan**: [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)

## Quick Reference

### Feature Summary
- **Purpose**: Promote selected topics on homepage in a controlled order
- **Location (Admin)**: `/admin/topics`
- **Location (Public)**: Homepage section above Featured Debates
- **Behavior**: Mark topic as featured + reorder featured topics; homepage reflects same order

### Acceptance Criteria
- Admin can mark/unmark a topic as featured.
- Admin can reorder featured topics and the order persists.
- Homepage shows featured topics above Featured Debates.
- Homepage topic order matches admin order exactly.
- Each topic card links to `/topics/[id]`.
- Card hover/interaction styling follows `_prototype2` references.
