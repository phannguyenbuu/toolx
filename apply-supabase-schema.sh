#!/bin/bash

# Script to apply Supabase schema
# Run this on Supabase VPS (103.175.248.173)

echo "🚀 Applying Supabase Schema..."

# Find PostgreSQL container
CONTAINER=$(docker ps | grep postgres | awk '{print $1}')

if [ -z "$CONTAINER" ]; then
    echo "❌ PostgreSQL container not found!"
    echo "Make sure Supabase is running with Docker"
    exit 1
fi

echo "✅ Found PostgreSQL container: $CONTAINER"

# Copy schema file to container
echo "📋 Copying schema file..."
docker cp supabase-schema.sql $CONTAINER:/tmp/schema.sql

# Apply schema
echo "⚡ Applying schema..."
docker exec -i $CONTAINER psql -U postgres -d postgres -f /tmp/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema applied successfully!"
    echo ""
    echo "📊 Created tables:"
    docker exec -i $CONTAINER psql -U postgres -d postgres -c "\dt"
    echo ""
    echo "🎉 Supabase backend is ready!"
else
    echo "❌ Failed to apply schema"
    exit 1
fi
