#!/bin/bash

# =====================================================
# APPLY SUPABASE MIGRATIONS
# =====================================================

SUPABASE_URL="http://157.66.80.125:8000"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

echo "=========================================="
echo "SUPABASE MIGRATION TOOL"
echo "=========================================="
echo ""
echo "Available migrations:"
echo "1. supabase-schema.sql (Base schema)"
echo "2. supabase-migration-business-config.sql (Business config)"
echo "3. supabase-migration-team-wallet.sql (Team & Wallet) ⚠️ REQUIRED"
echo ""
echo "⚠️  WARNING: You need to apply migration #3 to fix current errors!"
echo ""
echo "To apply migrations, you need to:"
echo "1. Access Supabase Studio: http://157.66.80.125:8000"
echo "2. Go to SQL Editor"
echo "3. Copy content from migration file"
echo "4. Run the SQL"
echo ""
echo "Or use psql:"
echo ""
echo "psql -h 157.66.80.125 -p 5432 -U postgres -d postgres < supabase-migration-team-wallet.sql"
echo ""
echo "=========================================="
