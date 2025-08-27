#!/bin/bash

echo "========================================="
echo "    Bank SulutGo ServiceDesk PM2 Starter"
echo "========================================="
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing PM2 globally..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        echo "Failed to install PM2. Please install manually: npm install -g pm2"
        exit 1
    fi
fi

# Create logs directory if not exists
mkdir -p logs

# Build the application
echo "Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "Build failed! Please fix the errors and try again."
    exit 1
fi

# Stop any existing instances
echo "Stopping existing PM2 instances..."
pm2 stop bsg-servicedesk 2>/dev/null

# Delete existing instances
pm2 delete bsg-servicedesk 2>/dev/null

# Start the application with PM2
echo "Starting ServiceDesk with PM2..."
pm2 start ecosystem.config.js --only bsg-servicedesk

# Show status
echo ""
echo "========================================="
echo "     ServiceDesk Status"
echo "========================================="
pm2 status

echo ""
echo "Application started successfully!"
echo ""
echo "Useful commands:"
echo "  View logs:     pm2 logs bsg-servicedesk"
echo "  Monitor:       pm2 monit"
echo "  Stop:          pm2 stop bsg-servicedesk"
echo "  Restart:       pm2 restart bsg-servicedesk"
echo "  Status:        pm2 status"
echo ""
echo "Access the application at: https://localhost"
echo ""

# Save PM2 process list
pm2 save

# Generate startup script (optional - requires sudo on Linux)
echo "To auto-start on system boot, run: sudo pm2 startup"