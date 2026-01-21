# Question Convergence Feature

## Overview
Manual question convergence feature in the admin panel that allows admins to select multiple semantically similar questions and merge them into a single unified question. This prevents debate fragmentation by consolidating stances, verdicts, and publications into fewer, stronger debates.

## Documentation

- **Implementation Plan**: [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) - Detailed development plan with phases, technical specifications, and testing strategy

## Quick Reference

### Feature Summary
- **Purpose**: Merge semantically similar questions to reduce fragmentation and strengthen debates
- **Location**: Admin panel → Questions page
- **User Flow**: Select 2+ questions → Click "Converge Questions" → Choose target → Confirm → Execute

### Key Components
1. **Database Schema**: QuestionRedirect model for URL redirects
2. **Database Layer**: Repository function with complex duplicate handling
3. **API Layer**: `/admin/api/questions/converge` endpoint
4. **Frontend**: Convergence modal component in questions page
5. **URL Redirects**: Route handler for `/questions/[id]` redirects

### Relationships Handled
- ArticleAnalysisAttempts (one-to-many, with month-based duplicate handling)
- ArticleStances (one-to-many, with article-based duplicate handling)
- Verdicts (one-to-many, with month-based duplicate handling)
- EvidenceBullets (via verdicts)
- TimelineEvents (one-to-many)

### Unique Challenges
- **Duplicate Handling**: Three different relationship types with unique constraints require careful duplicate resolution
- **Verdict Merging**: Complex logic for merging verdicts from same month (evidence bullets, confidence)
- **URL Redirects**: Need to maintain redirects from old question IDs to new unified question

### Estimated Complexity
~4-5 days of development

## Acceptance Criteria

✅ Admin can view a list of questions and select two or more to merge into a single final question  
✅ When merging, all stances, verdicts, publications, and debates are migrated to the final question  
✅ Old URLs maintain redirects or aliases to the new unified question  
✅ No automatic similarity detection required - fully manual, but UI should facilitate the process



