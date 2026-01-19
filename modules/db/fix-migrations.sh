#!/bin/bash
# Fix migration history and apply pending migrations

cd "$(dirname "$0")"
export DATABASE_URL="postgresql://acta:acta_dev_password@localhost:5432/acta_dev?schema=public"

echo "🔧 Fixing migration history..."

# Mark ghost migrations as applied (exist in DB but not locally)
echo "Marking ghost migrations as applied..."
npx prisma migrate resolve --applied "$(date +%Y%m%d%H%M%S)_add_debate_card_storage" || echo "Already resolved or not found"
npx prisma migrate resolve --applied "$(date +%Y%m%d%H%M%S)_add_context_blurb_to_questions" || echo "Already resolved or not found"
npx prisma migrate resolve --applied "$(date +%Y%m%d%H%M%S)_add_question_redirect" || echo "Already resolved or not found"

echo ""
echo "📦 Applying pending migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Migrations complete!"
echo "Run: cd ../.. && npm run db:generate"

