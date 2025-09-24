#!/bin/bash

# Database Seeding Script for Docker Compose
# This script waits for the database and backend to be ready, then seeds the database
# 
# SEEDER FUNCTIONALITY COMMENTED OUT - UNCOMMENT WHEN READY TO USE

echo "⚠️  Database seeding is currently disabled. Uncomment the seeder functionality when ready."
exit 0

# COMMENTED OUT - UNCOMMENT WHEN READY
/*
set -e

# Configuration
MAX_RETRIES=30
RETRY_DELAY=10
BACKEND_URL="http://backend:3000"
DATABASE_HOST="postgres"
DATABASE_PORT="5432"

echo "🌱 Starting database seeding process..."

# Function to check if a service is ready
check_service() {
    local service_name=$1
    local check_command=$2
    local retries=0
    
    echo "⏳ Waiting for $service_name to be ready..."
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if eval "$check_command" >/dev/null 2>&1; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        
        retries=$((retries + 1))
        echo "⏳ $service_name not ready yet, retrying in ${RETRY_DELAY}s... (attempt $retries/$MAX_RETRIES)"
        sleep $RETRY_DELAY
    done
    
    echo "❌ $service_name failed to become ready after $MAX_RETRIES attempts"
    return 1
}

# Check database connection
check_database() {
    pg_isready -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U postgres
}

# Check backend health
check_backend() {
    curl -f "$BACKEND_URL/health" || curl -f "$BACKEND_URL/"
}

# Wait for database
if ! check_service "PostgreSQL Database" "check_database"; then
    echo "❌ Database is not ready, exiting..."
    exit 1
fi

# Wait for backend
if ! check_service "Backend Service" "check_backend"; then
    echo "❌ Backend is not ready, exiting..."
    exit 1
fi

# Additional wait to ensure all services are fully initialized
echo "⏳ Waiting additional 30 seconds for all services to stabilize..."
sleep 30

# Check if seed data file exists
if [ ! -f "/app/seed-data.json" ]; then
    echo "❌ Seed data file not found at /app/seed-data.json"
    exit 1
fi

echo "📄 Seed data file found, proceeding with seeding..."

# Run the seeding script
echo "🌱 Starting database seeding..."
cd /app/backend

# Check if we should run migrations first
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "🔄 Running database migrations..."
    npm run migration:run
fi

# Run the seeding
if [ "$NODE_ENV" = "production" ]; then
    echo "🏭 Running in production mode..."
    npm run seed:prod
else
    echo "🔧 Running in development mode..."
    npm run seed
fi

echo "🎉 Database seeding completed successfully!"

# Optional: Run verification
if [ "$VERIFY_SEEDING" = "true" ]; then
    echo "🔍 Verifying seeded data..."
    # Add verification logic here if needed
fi

echo "✅ Seeding process completed!"
*/
