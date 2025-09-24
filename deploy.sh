#!/bin/bash

echo "🚀 Starting PrescriberPoint Heroku Deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    print_error "Heroku CLI is not installed. Please install it first."
    exit 1
fi

print_status "Heroku CLI is installed"

# Check if user is logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    print_warning "Please login to Heroku first:"
    heroku login --interactive
fi

print_status "Logged in to Heroku"

# Set app names (you can customize these)
BACKEND_APP_NAME="prescriber-point-api-$(date +%s)"
FRONTEND_APP_NAME="prescriber-point-app-$(date +%s)"

echo "📝 Creating Heroku applications..."

# Create backend application
cd backend
if heroku create $BACKEND_APP_NAME; then
    print_status "Backend app created: $BACKEND_APP_NAME"
else
    print_error "Failed to create backend app"
    exit 1
fi

# Create frontend application
cd ../frontend
if heroku create $FRONTEND_APP_NAME; then
    print_status "Frontend app created: $FRONTEND_APP_NAME"
else
    print_error "Failed to create frontend app"
    exit 1
fi

echo "🗄️ Adding PostgreSQL database..."

# Add PostgreSQL to backend
cd ../backend
if heroku addons:create heroku-postgresql:essential-0 --app $BACKEND_APP_NAME; then
    print_status "PostgreSQL database added"
else
    print_warning "Database may already exist or failed to create"
fi

echo "⚙️ Setting environment variables..."

# Set backend environment variables
heroku config:set NODE_ENV=production --app $BACKEND_APP_NAME
print_warning "Please set your ANTHROPIC_API_KEY:"
echo "heroku config:set ANTHROPIC_API_KEY=your_key_here --app $BACKEND_APP_NAME"

# Set frontend environment variables
heroku config:set NODE_ENV=production --app $FRONTEND_APP_NAME
heroku config:set NEXT_PUBLIC_API_URL=https://$BACKEND_APP_NAME.herokuapp.com --app $FRONTEND_APP_NAME

print_status "Environment variables configured"

echo "📦 Deploying applications..."

# Deploy backend
cd ../backend
print_status "Deploying backend..."
if git remote | grep -q heroku; then
    git remote remove heroku
fi
heroku git:remote -a $BACKEND_APP_NAME
git add .
git commit -m "Deploy backend to Heroku" || print_warning "No changes to commit"
if git push heroku HEAD:main; then
    print_status "Backend deployed successfully"
else
    print_error "Backend deployment failed"
fi

# Deploy frontend
cd ../frontend
print_status "Deploying frontend..."
if git remote | grep -q heroku; then
    git remote remove heroku
fi
heroku git:remote -a $FRONTEND_APP_NAME
git add .
git commit -m "Deploy frontend to Heroku" || print_warning "No changes to commit"
if git push heroku HEAD:main; then
    print_status "Frontend deployed successfully"
else
    print_error "Frontend deployment failed"
fi

echo "🏃‍♂️ Running database migrations..."
cd ../backend
if heroku run npm run typeorm migration:run --app $BACKEND_APP_NAME; then
    print_status "Database migrations completed"
else
    print_warning "Migration command may have failed - check manually"
fi

echo "📊 Scaling dynos..."
heroku ps:scale web=1 --app $BACKEND_APP_NAME
heroku ps:scale web=1 --app $FRONTEND_APP_NAME

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📱 Your applications are available at:"
echo "   Frontend: https://$FRONTEND_APP_NAME.herokuapp.com"
echo "   Backend:  https://$BACKEND_APP_NAME.herokuapp.com"
echo ""
echo "🔧 Don't forget to:"
echo "   1. Set your ANTHROPIC_API_KEY: heroku config:set ANTHROPIC_API_KEY=your_key --app $BACKEND_APP_NAME"
echo "   2. Check the logs: heroku logs --tail --app $BACKEND_APP_NAME"
echo "   3. Test your endpoints"
echo ""
print_status "Deployment script completed!"