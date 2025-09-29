#!/bin/bash

# Quick Start Script for Bank SulutGo ServiceDesk Docker Deployment
# This script automates the initial setup and deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_MODE="${1:-development}"
PROJECT_NAME="bsg-servicedesk"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Header
print_header() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║     Bank SulutGo ServiceDesk - Docker Quick Start         ║"
    echo "║                                                            ║"
    echo "║     Deployment Mode: ${DEPLOYMENT_MODE}                   ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    success "Docker installed: $(docker --version)"

    # Check Docker Compose
    if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose v2."
    fi
    success "Docker Compose installed: $(docker compose version)"

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running. Please start Docker."
    fi
    success "Docker daemon is running"

    # Check available disk space
    AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
    info "Available disk space: ${AVAILABLE_SPACE}"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."

    # Check if .env exists
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            info "Created .env file from .env.example"

            # Generate secrets
            log "Generating secure secrets..."

            # Generate NEXTAUTH_SECRET
            NEXTAUTH_SECRET=$(openssl rand -base64 32)
            sed -i.bak "s/NEXTAUTH_SECRET=\".*\"/NEXTAUTH_SECRET=\"${NEXTAUTH_SECRET}\"/" .env

            # Generate ENCRYPTION_KEY (32 chars)
            ENCRYPTION_KEY=$(openssl rand -hex 16)
            sed -i.bak "s/ENCRYPTION_KEY=\".*\"/ENCRYPTION_KEY=\"${ENCRYPTION_KEY}\"/" .env

            # Generate JWT_SECRET
            JWT_SECRET=$(openssl rand -base64 32)
            sed -i.bak "s/JWT_SECRET=\".*\"/JWT_SECRET=\"${JWT_SECRET}\"/" .env

            # Generate database password for production
            if [ "$DEPLOYMENT_MODE" = "production" ]; then
                DB_PASSWORD=$(openssl rand -base64 16)
                sed -i.bak "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${DB_PASSWORD}/" .env
            fi

            rm -f .env.bak
            success "Generated secure secrets"
        else
            error ".env.example not found. Please create it first."
        fi
    else
        warning ".env file already exists. Skipping environment setup."
        warning "Please ensure all required variables are configured."
    fi

    # Create necessary directories
    mkdir -p uploads logs certificates docker/backup
    success "Created necessary directories"
}

# Generate SSL certificates
generate_certificates() {
    log "Checking SSL certificates..."

    if [ ! -f certificates/server.crt ] || [ ! -f certificates/server.key ]; then
        log "Generating self-signed SSL certificates..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout certificates/server.key \
            -out certificates/server.crt \
            -subj "/C=ID/ST=North Sulawesi/L=Manado/O=Bank SulutGo/CN=localhost" \
            2>/dev/null

        success "SSL certificates generated"
    else
        info "SSL certificates already exist"
    fi
}

# Build and start containers
deploy_development() {
    log "Deploying in DEVELOPMENT mode..."

    # Build images
    log "Building Docker images..."
    docker compose -f docker-compose.dev.yml build

    # Start containers
    log "Starting containers..."
    docker compose -f docker-compose.dev.yml up -d

    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 10

    # Run migrations
    log "Running database migrations..."
    docker compose -f docker-compose.dev.yml exec -T app-dev npx prisma migrate deploy || warning "Migration might have failed - checking database..."

    # Seed database
    read -p "Do you want to seed the database with initial data? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Seeding database..."
        docker compose -f docker-compose.dev.yml exec -T app-dev npm run db:seed || warning "Seeding might have failed"
    fi

    success "Development deployment completed!"

    echo
    echo -e "${CYAN}Access Points:${NC}"
    echo -e "  ${GREEN}➤${NC} Application:    http://localhost:3000"
    echo -e "  ${GREEN}➤${NC} Prisma Studio:  http://localhost:5555"
    echo -e "  ${GREEN}➤${NC} Mailhog:        http://localhost:8025"
    echo -e "  ${GREEN}➤${NC} Adminer:        http://localhost:8080"
    echo
    echo -e "${CYAN}Default Credentials:${NC}"
    echo -e "  Database: servicedesk / servicedesk_dev"
    echo
}

deploy_production() {
    log "Deploying in PRODUCTION mode..."

    # Build images
    log "Building Docker images..."
    docker compose -f docker-compose.prod.yml build

    # Start containers
    log "Starting containers..."
    docker compose -f docker-compose.prod.yml up -d

    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 15

    # Run migrations
    log "Running database migrations..."
    docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy || warning "Migration might have failed - checking database..."

    # Initial setup
    read -p "Is this a fresh installation? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Running initial setup..."
        docker compose -f docker-compose.prod.yml exec -T app npm run db:seed:consolidated || warning "Initial setup might have failed"
    fi

    success "Production deployment completed!"

    echo
    echo -e "${CYAN}Access Points:${NC}"
    echo -e "  ${GREEN}➤${NC} Application:    https://localhost (redirects from http)"
    echo -e "  ${GREEN}➤${NC} Prometheus:     http://localhost:9090"
    echo -e "  ${GREEN}➤${NC} Grafana:        http://localhost:3001 (admin/admin)"
    echo
    echo -e "${YELLOW}⚠ Important:${NC}"
    echo "  1. Change default passwords immediately"
    echo "  2. Configure proper SSL certificates for production"
    echo "  3. Update NEXTAUTH_URL in .env to your domain"
    echo "  4. Configure email settings in .env"
    echo
}

# Show logs
show_logs() {
    read -p "Do you want to view the logs? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ "$DEPLOYMENT_MODE" = "development" ]; then
            docker compose -f docker-compose.dev.yml logs -f
        else
            docker compose -f docker-compose.prod.yml logs -f
        fi
    fi
}

# Health check
health_check() {
    log "Running health check..."
    sleep 5

    if [ "$DEPLOYMENT_MODE" = "development" ]; then
        HEALTH_URL="http://localhost:3000/api/health"
    else
        HEALTH_URL="http://localhost:4000/api/health"
    fi

    if curl -f -s "${HEALTH_URL}" > /dev/null; then
        success "Application is healthy"
    else
        warning "Application health check failed. Please check logs."
    fi
}

# Cleanup function
cleanup() {
    warning "Cleaning up..."
    if [ "$DEPLOYMENT_MODE" = "development" ]; then
        docker compose -f docker-compose.dev.yml down
    else
        docker compose -f docker-compose.prod.yml down
    fi
}

# Main execution
main() {
    print_header

    # Set trap for cleanup on error
    trap cleanup ERR

    # Run checks
    check_prerequisites

    # Setup
    setup_environment
    generate_certificates

    # Deploy based on mode
    case $DEPLOYMENT_MODE in
        development|dev)
            deploy_development
            ;;
        production|prod)
            deploy_production
            ;;
        *)
            error "Invalid deployment mode. Use 'development' or 'production'"
            ;;
    esac

    # Health check
    health_check

    # Success message
    echo
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}    Deployment successful! Your application is ready.       ${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo

    # Show commands
    echo -e "${CYAN}Useful Commands:${NC}"
    if [ "$DEPLOYMENT_MODE" = "development" ]; then
        echo "  docker compose -f docker-compose.dev.yml ps       # Check status"
        echo "  docker compose -f docker-compose.dev.yml logs -f  # View logs"
        echo "  docker compose -f docker-compose.dev.yml down     # Stop containers"
        echo "  docker compose -f docker-compose.dev.yml restart  # Restart containers"
    else
        echo "  docker compose -f docker-compose.prod.yml ps       # Check status"
        echo "  docker compose -f docker-compose.prod.yml logs -f  # View logs"
        echo "  docker compose -f docker-compose.prod.yml down     # Stop containers"
        echo "  docker compose -f docker-compose.prod.yml restart  # Restart containers"
    fi
    echo

    # Optionally show logs
    show_logs
}

# Show usage
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [development|production]"
    echo ""
    echo "Quick start script for Bank SulutGo ServiceDesk Docker deployment"
    echo ""
    echo "Options:"
    echo "  development  Deploy in development mode (default)"
    echo "  production   Deploy in production mode"
    echo "  --help       Show this help message"
    exit 0
fi

# Run main function
main