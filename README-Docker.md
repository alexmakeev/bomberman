# Docker Setup Guide

This document provides comprehensive instructions for running the Bomberman multiplayer game using Docker.

## Quick Start

### Development Environment

```bash
# Clone the repository
git clone https://github.com/alexmakeev/bomberman.git
cd bomberman

# Copy environment variables
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app
```

The application will be available at:
- **Game**: http://localhost:8080 (localhost-only for security)
- **Redis Commander**: http://localhost:8081 (username: admin, password: redis_password)
- **pgAdmin**: http://localhost:8082 (admin@bomberman.local / admin_password)

### Production Environment

```bash
# Create production environment file
cp .env.example .env.prod
# Edit .env.prod with production values

# Start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Services Overview

### Application Services

| Service | Purpose | Port | Network Access |
|---------|---------|------|----------------|
| `app` | Node.js game server + static files | 8080 | Localhost only |
| `postgres` | Persistent database | 5432 | Internal |
| `redis` | Real-time state & pub/sub | 6379 | Internal |

### Development Services

| Service | Purpose | Port | Access |
|---------|---------|------|--------|
| `redis-commander` | Redis management UI | 8081 | Development only |
| `pgadmin` | PostgreSQL management UI | 8082 | Development only |

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
# Required for production
POSTGRES_PASSWORD=your_secure_password
REDIS_PASSWORD=your_secure_redis_password
JWT_SECRET=your_32_character_jwt_secret
```

### Database Initialization

The PostgreSQL database is automatically initialized with:
- User tables and indexes
- Game statistics schema
- Default admin user (username: `admin`, password: `admin123`)
- System configuration

### Redis Configuration

Redis is configured for:
- Real-time game state storage
- Pub/sub messaging for WebSocket events
- Session management
- Optimized for gaming workloads

## Docker Commands

### Basic Operations

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View logs
docker-compose logs -f [service_name]

# Execute commands in containers
docker-compose exec app npm run migrate
docker-compose exec postgres psql -U bomberman_user -d bomberman
docker-compose exec redis redis-cli
```

### Development Workflow

```bash
# Start with automatic rebuilding
docker-compose up --build

# Run tests
docker-compose exec app npm test

# Access application shell
docker-compose exec app sh

# Database operations
docker-compose exec postgres psql -U bomberman_user -d bomberman
```

### Production Deployment

```bash
# Production build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Health checks
docker-compose ps
curl http://localhost:8080/health
```

## Networking

### Service Communication

Services communicate using Docker's internal network (`bomberman-network`):
- Application connects to `postgres:5432`
- Application connects to `redis:6379`
- Application serves static files directly

### Port Mapping

| Internal Port | External Port | Service | Purpose |
|---------------|---------------|---------|---------|
| 8080 | 127.0.0.1:8080 | app | HTTP API, WebSocket & Static Files |
| 5432 | 5432 | postgres | Database (dev only) |
| 6379 | 6379 | redis | Redis (dev only) |
| 8081 | 8081 | redis-commander | Redis UI (dev only) |
| 80 | 8082 | pgadmin | PostgreSQL UI (dev only) |

## Data Persistence

### Volumes

| Volume | Purpose | Backup Required |
|--------|---------|-----------------|
| `postgres_data` | Database files | Yes |
| `redis_data` | Redis persistence | Optional |
| `pgadmin_data` | pgAdmin settings | No |

### Backup Strategy

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U bomberman_user bomberman > backup.sql

# Backup Redis
docker-compose exec redis redis-cli --rdb /data/backup.rdb

# Restore PostgreSQL
cat backup.sql | docker-compose exec -T postgres psql -U bomberman_user bomberman
```

## Monitoring

### Health Checks

All services include health checks:
- Application: `/health` endpoint
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app

# Follow with timestamps
docker-compose logs -f -t app
```

## Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs service_name

# Restart specific service
docker-compose restart service_name
```

**Database connection issues:**
```bash
# Verify database is ready
docker-compose exec postgres pg_isready -U bomberman_user

# Check database logs
docker-compose logs postgres

# Connect manually
docker-compose exec postgres psql -U bomberman_user -d bomberman
```

**Redis connection issues:**
```bash
# Test Redis connection
docker-compose exec redis redis-cli ping

# Check Redis logs
docker-compose logs redis

# Monitor Redis commands
docker-compose exec redis redis-cli monitor
```

### Performance Tuning

**PostgreSQL:**
- Adjust `shared_buffers` in production compose
- Monitor query performance with pgAdmin
- Enable query logging for slow queries

**Redis:**
- Monitor memory usage with Redis Commander
- Adjust `maxmemory` settings
- Use appropriate eviction policies

**Application:**
- Serves both API and static files directly
- Monitor WebSocket connections
- Adjust rate limiting based on load
- Use external reverse proxy (Caddy) for production routing

## Security Considerations

### Production Security

1. **Change default passwords** in `.env`
2. **Use strong JWT secrets** (32+ characters)
3. **App bound to localhost only** - use external reverse proxy for HTTPS
4. **Restrict database access** (remove port exposure in production)
5. **Use Docker secrets** for sensitive data
6. **Regular security updates** for base images

### Network Security

- Application bound to 127.0.0.1:8080 for localhost-only access
- Use external reverse proxy (Caddy/Nginx) for HTTPS termination
- Internal Docker network for service communication
- Database and Redis not exposed to host network in production

## Scaling

### Horizontal Scaling

```yaml
# Scale application instances
services:
  app:
    deploy:
      replicas: 3
    
# External load balancer (Caddy) configuration
# Configure upstream servers pointing to localhost:8080
```

### Resource Limits

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

This simplified Docker setup provides a secure, production-ready environment for the Bomberman multiplayer game with:
- Localhost-only application binding for security
- Direct static file serving from Node.js
- Proper service isolation and data persistence
- Ready for external reverse proxy integration (Caddy/Nginx)
- Monitoring capabilities through development tools