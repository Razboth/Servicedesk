#!/bin/bash

###############################################################################
# ServiceDesk Linux Server Deployment Script
# Automated Docker deployment for production Linux servers
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ServiceDesk"
DOCKER_COMPOSE_FILE="docker-compose.linux-server.yml"
ENV_FILE=".env"
DATA_DIR="/var/lib/servicedesk"
BACKUP_DIR="/var/backups/servicedesk"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi

    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        error "Docker Compose plugin is not installed"
    fi

    # Check if docker-compose file exists
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        error "Docker compose file not found: $DOCKER_COMPOSE_FILE"
    fi

    log "Prerequisites check passed"
}

# Create required directories
create_directories() {
    log "Creating required directories..."

    mkdir -p "$DATA_DIR"/{postgres,uploads}
    mkdir -p /var/log/servicedesk
    mkdir -p "$BACKUP_DIR"
    mkdir -p nginx/ssl
    mkdir -p backups

    chmod -R 755 "$DATA_DIR"
    chmod -R 755 /var/log/servicedesk
    chmod -R 700 "$BACKUP_DIR"

    log "Directories created successfully"
}

# Setup environment file
setup_environment() {
    log "Setting up environment configuration..."

    if [ ! -f "$ENV_FILE" ]; then
        warning ".env file not found. Creating from template..."

        if [ -f ".env.example" ]; then
            cp .env.example "$ENV_FILE"
            warning "Please edit $ENV_FILE with your production values"
            warning "Press Enter to continue after editing, or Ctrl+C to cancel"
            read -r
        else
            error ".env.example not found. Please create $ENV_FILE manually"
        fi
    fi

    # Validate required variables
    required_vars=("DB_PASSWORD" "NEXTAUTH_SECRET" "ENCRYPTION_KEY" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$ENV_FILE"; then
            error "Required environment variable $var not found in $ENV_FILE"
        fi
    done

    log "Environment configuration validated"
}

# Pull Docker images
pull_images() {
    log "Pulling Docker images..."
    docker compose -f "$DOCKER_COMPOSE_FILE" pull
    log "Images pulled successfully"
}

# Build application image
build_application() {
    log "Building application Docker image..."
    docker compose -f "$DOCKER_COMPOSE_FILE" build --no-cache app
    log "Application image built successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."

    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 10

    # Run Prisma migrations
    docker compose -f "$DOCKER_COMPOSE_FILE" exec -T app npx prisma migrate deploy || {
        warning "Migration failed. This might be expected on first deployment"
    }

    log "Migrations completed"
}

# Start services
start_services() {
    log "Starting services..."
    docker compose -f "$DOCKER_COMPOSE_FILE" up -d
    log "Services started successfully"
}

# Check service health
check_health() {
    log "Checking service health..."

    sleep 15

    # Check if containers are running
    if ! docker compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
        error "Services failed to start"
    fi

    # Check application health
    if docker compose -f "$DOCKER_COMPOSE_FILE" exec -T app curl -f http://localhost:4000/api/health > /dev/null 2>&1; then
        log "Application health check passed"
    else
        warning "Application health check failed. Check logs with: docker compose logs app"
    fi

    log "Service health check completed"
}

# Setup SSL certificates
setup_ssl() {
    info "Setting up SSL certificates..."

    # Check if domain is configured
    if ! grep -q "DOMAIN=" "$ENV_FILE"; then
        warning "Domain not configured in .env. Skipping SSL setup"
        return
    fi

    # Run certbot
    log "Obtaining SSL certificate..."
    docker compose -f "$DOCKER_COMPOSE_FILE" --profile ssl-setup run --rm certbot

    # Reload nginx
    docker compose -f "$DOCKER_COMPOSE_FILE" exec nginx nginx -s reload

    log "SSL certificates configured"
}

# Setup automated backups
setup_backups() {
    log "Setting up automated backups..."

    cat > /etc/cron.daily/servicedesk-backup << 'EOF'
#!/bin/bash
# ServiceDesk Daily Backup
BACKUP_DIR="/var/backups/servicedesk"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker exec servicedesk-db pg_dump -U servicedesk servicedesk | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Keep only last 7 days
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +7 -delete

# Log backup
echo "[$(date)] Backup completed: db_$DATE.sql.gz" >> /var/log/servicedesk/backup.log
EOF

    chmod +x /etc/cron.daily/servicedesk-backup

    log "Automated backups configured"
}

# Display deployment information
display_info() {
    echo ""
    echo "========================================="
    log "$APP_NAME Deployment Completed!"
    echo "========================================="
    echo ""
    info "Application URL: https://$(hostname -f)"
    info "Health Check: http://$(hostname -f)/api/health"
    echo ""
    info "Useful Commands:"
    echo "  - View logs: docker compose -f $DOCKER_COMPOSE_FILE logs -f"
    echo "  - Check status: docker compose -f $DOCKER_COMPOSE_FILE ps"
    echo "  - Restart services: docker compose -f $DOCKER_COMPOSE_FILE restart"
    echo "  - Stop services: docker compose -f $DOCKER_COMPOSE_FILE down"
    echo ""
    info "Data Locations:"
    echo "  - Database: $DATA_DIR/postgres"
    echo "  - Uploads: $DATA_DIR/uploads"
    echo "  - Logs: /var/log/servicedesk"
    echo "  - Backups: $BACKUP_DIR"
    echo ""
}

# Main deployment process
main() {
    echo "========================================="
    log "Starting $APP_NAME Deployment"
    echo "========================================="
    echo ""

    check_root
    check_prerequisites
    create_directories
    setup_environment
    pull_images
    build_application
    start_services
    run_migrations
    check_health
    setup_ssl
    setup_backups
    display_info

    log "Deployment script completed successfully!"
}

# Run main function
main "$@"