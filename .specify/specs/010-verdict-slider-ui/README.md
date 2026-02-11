# Verdict Slider UI

## Overview
Add a separate, reusable horizontal verdict slider component that maps existing `verdictLabel` values to fixed positions, without changing database schema or existing verdict data. Apply it to cards and the question detail hero area.

## Documentation

- **Implementation Plan**: [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)

## Quick Reference

### Feature Summary
- **Purpose**: Standardize verdict visualization with a slider UI across surfaces
- **Scope**: Cards + question detail page
- **Data Source**: Existing verdict label/confidence fields (no DB changes)
- **Mapping**: 5 fixed stops (`No`, `Probably Not`, `Unclear`, `Probably Yes`, `Yes`)

### Acceptance Criteria
- Reusable verdict slider exists in web components.
- Slider appears on cards and question detail hero.
- Slider position is derived from `verdictLabel` fixed-stop mapping.
- Existing DB/API structures remain unchanged.
- Current publication alignment section continues to work.
