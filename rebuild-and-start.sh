#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Rebuilding and starting ServiceDesk app with PM2...${NC}"

# Stop existing PM2 process
echo -e "${YELLOW}📦 Stopping existing PM2 process...${NC}"
npm run pm2:stop

# Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed! Exiting...${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully!${NC}"

# Start with PM2
echo -e "${YELLOW}🚀 Starting with PM2...${NC}"
npm run pm2:start

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ PM2 start failed! Exiting...${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Application started successfully with PM2!${NC}"

# Save PM2 process list
npm run pm2:save

# Open PM2 logs
echo -e "${YELLOW}📋 Opening PM2 logs...${NC}"
npm run pm2:logs