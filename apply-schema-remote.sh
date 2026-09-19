#!/bin/bash

# Script to apply schema remotely to Supabase VPS
# Run this from current VPS (157.66.80.125)

SUPABASE_HOST="103.175.248.173"
SUPABASE_USER="root"

echo "🚀 Applying Supabase Schema Remotely..."
echo ""

# Check if we can SSH
echo "Testing SSH connection..."
ssh -o ConnectTimeout=5 -o BatchMode=yes $SUPABASE_USER@$SUPABASE_HOST "echo 'SSH OK'" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ Cannot SSH to Supabase VPS"
    echo ""
    echo "Please run these commands manually on Supabase VPS:"
    echo ""
    echo "1. Copy schema file:"
    echo "   scp supabase-schema.sql root@103.175.248.173:/root/"
    echo ""
    echo "2. SSH to Supabase VPS:"
    echo "   ssh root@103.175.248.173"
    echo ""
    echo "3. Find PostgreSQL container:"
    echo "   docker ps | grep postgres"
    echo ""
    echo "4. Apply schema:"
    echo "   CONTAINER=\$(docker ps | grep postgres | awk '{print \$1}')"
    echo "   docker cp supabase-schema.sql \$CONTAINER:/tmp/schema.sql"
    echo "   docker exec -i \$CONTAINER psql -U postgres -d postgres -f /tmp/schema.sql"
    echo ""
    exit 1
fi

echo "✅ SSH connection OK"
echo ""

# Copy schema file
echo "📋 Copying schema file..."
scp supabase-schema.sql $SUPABASE_USER@$SUPABASE_HOST:/root/

if [ $? -ne 0 ]; then
    echo "❌ Failed to copy schema file"
    exit 1
fi

echo "✅ Schema file copied"
echo ""

# Apply schema
echo "⚡ Applying schema..."
ssh $SUPABASE_USER@$SUPABASE_HOST << 'ENDSSH'
cd /root

# Find PostgreSQL container
CONTAINER=$(docker ps | grep postgres | awk '{print $1}')

if [ -z "$CONTAINER" ]; then
    echo "❌ PostgreSQL container not found!"
    echo "Checking for Supabase containers..."
    docker ps
    exit 1
fi

echo "✅ Found PostgreSQL container: $CONTAINER"

# Copy schema to container
docker cp supabase-schema.sql $CONTAINER:/tmp/schema.sql

# Apply schema
docker exec -i $CONTAINER psql -U postgres -d postgres -f /tmp/schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Schema applied successfully!"
    echo ""
    echo "📊 Tables created:"
    docker exec -i $CONTAINER psql -U postgres -d postgres -c "\dt public.*"
else
    echo "❌ Failed to apply schema"
    exit 1
fi
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Supabase backend is ready!"
    echo ""
    echo "Test it:"
    echo "  curl http://157.66.80.125/supabase/rest/v1/profiles -H 'apikey: YOUR_KEY'"
else
    echo "❌ Failed to apply schema remotely"
    exit 1
fi
