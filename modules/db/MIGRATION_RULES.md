# Database Migration Rules

## ⚠️ CRITICAL RULE: Never Modify Database Without a Migration

**ALL database schema changes MUST go through Prisma migrations.**

### Why?

1. **Version Control**: Migrations are tracked in git, providing a complete history
2. **Reproducibility**: Anyone can recreate the database from scratch
3. **Team Collaboration**: Everyone gets the same schema changes
4. **Production Safety**: Migrations can be tested and reviewed before deployment
5. **Rollback Capability**: Migrations can be rolled back if needed

### What This Means

❌ **NEVER:**
- Run SQL scripts directly against the database
- Use `prisma db push` for schema changes (except rapid prototyping)
- Manually modify tables, columns, indexes, or constraints
- Update migration checksums manually
- Skip migrations for "quick fixes"

✅ **ALWAYS:**
- Create a migration with `npm run db:migrate` (or `prisma migrate dev`)
- Review the generated migration SQL before applying
- Test migrations on a development database first
- Commit migration files to git
- Use `npm run db:migrate:deploy` for production

### Exception: Data Migrations

Data migrations (INSERT, UPDATE, DELETE) can be run directly, but should still be:
- Documented
- Reversible if possible
- Tested on development first

### Workflow

1. **Modify `schema.prisma`**
2. **Create migration**: `npm run db:migrate`
3. **Review the generated SQL**
4. **Test the migration**
5. **Commit both schema.prisma and migration files**

### If You Need to Fix a Migration

If a migration has issues:
1. Create a NEW migration to fix it
2. Never modify an already-applied migration file
3. If absolutely necessary, mark old migration as rolled back and create a new one

---

**This rule is non-negotiable. Database changes without migrations break the development workflow and can cause data loss in production.**

