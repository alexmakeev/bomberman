#!/bin/bash

# Unified Development Server Manager
# Manages frontend, backend, or both servers with unified interface

set -e


# Configuration
FRONTEND_PORT=3000
BACKEND_PORT=8080
FRONTEND_COMMAND="npm run dev:client"
BACKEND_COMMAND="npm run dev:server"
FRONTEND_LOG="front.log"
BACKEND_LOG="back.log"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -ti:$port >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on a specific port
kill_port_processes() {
    local port=$1
    local service_name=$2
    
    if check_port $port; then
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 1
        
        if check_port $port; then
            echo "❌ Failed to free port $port ($service_name)"
            return 1
        fi
    fi
    return 0
}

# Function to check Docker services
check_docker_services() {
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker not running"
        return 1
    fi
    
    local required_services=("bomberman-postgres" "bomberman-redis")
    local missing_services=()
    
    for service in "${required_services[@]}"; do
        if ! docker ps --format "table {{.Names}}" | grep -q "^$service$"; then
            missing_services+=("$service")
        fi
    done
    
    if [ ${#missing_services[@]} -gt 0 ]; then
        docker compose up -d >/dev/null 2>&1
        
        for i in {1..15}; do
            all_healthy=true
            for service in "${required_services[@]}"; do
                if ! docker ps --format "table {{.Names}}\t{{.Status}}" | grep "^$service" | grep -q "healthy"; then
                    all_healthy=false
                    break
                fi
            done
            
            if [ "$all_healthy" = true ]; then
                return 0
            fi
            sleep 2
        done
        
        echo "❌ Docker services failed to start"
        return 1
    fi
    
    return 0
}

# Function to clean log files
clean_logs() {
    local mode=$1
    
    case $mode in
        front)
            > "$FRONTEND_LOG"
            ;;
        back)
            > "$BACKEND_LOG"
            ;;
        full)
            > "$FRONTEND_LOG"
            > "$BACKEND_LOG"
            ;;
    esac
}

# Function to start a server in background
start_server() {
    local server_type=$1
    local port=$2
    local command=$3
    local log_file=$4
    
    nohup $command >> "$log_file" 2>&1 &
    return 0
}

# Function to wait for server to be ready
wait_for_server() {
    local server_type=$1
    local port=$2
    local max_attempts=15
    
    for i in $(seq 1 $max_attempts); do
        if curl -s "http://localhost:$port" >/dev/null 2>&1; then
            return 0
        elif curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done
    
    return 0
}

# Function to get server status symbol
get_server_status() {
    local port=$1
    
    if check_port $port; then
        # Test if server is responding with 200 status
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" 2>/dev/null | grep -q "200"; then
            echo "🟢"
        else
            echo "🟡"
        fi
    else
        echo "🔴"
    fi
}

# Function to show full status
show_status() {
    echo "Bomberman Servers Status"
    
    # Get status symbols
    local fe_status=$(get_server_status $FRONTEND_PORT)
    local be_status=$(get_server_status $BACKEND_PORT)
    
    echo "${fe_status} Frontend :$FRONTEND_PORT ${be_status} Backend :$BACKEND_PORT"
    
    # Docker services status (one line)
    if docker info >/dev/null 2>&1; then
        local postgres_status=$(docker ps --filter "name=bomberman-postgres" --format "{{.Status}}" | grep -o "healthy\|Up" | head -1)
        local redis_status=$(docker ps --filter "name=bomberman-redis" --format "{{.Status}}" | grep -o "healthy\|Up" | head -1)
        
        local pg_symbol="🔴"
        local redis_symbol="🔴"
        
        if [ "$postgres_status" = "healthy" ] || [ "$postgres_status" = "Up" ]; then
            pg_symbol="🟢"
        fi
        
        if [ "$redis_status" = "healthy" ] || [ "$redis_status" = "Up" ]; then
            redis_symbol="🟢"
        fi
        
        echo "${pg_symbol} PostgreSQL ${redis_symbol} Redis"
    else
        echo "🔴 Docker 🔴 PostgreSQL 🔴 Redis"
    fi
}

# Function to show condensed status (no title)
show_condensed_status() {
    # Get status symbols
    local fe_status=$(get_server_status $FRONTEND_PORT)
    local be_status=$(get_server_status $BACKEND_PORT)
    
    echo "${fe_status} Frontend :$FRONTEND_PORT ${be_status} Backend :$BACKEND_PORT"
    
    # Docker services status (one line)
    if docker info >/dev/null 2>&1; then
        local postgres_status=$(docker ps --filter "name=bomberman-postgres" --format "{{.Status}}" | grep -o "healthy\|Up" | head -1)
        local redis_status=$(docker ps --filter "name=bomberman-redis" --format "{{.Status}}" | grep -o "healthy\|Up" | head -1)
        
        local pg_symbol="🔴"
        local redis_symbol="🔴"
        
        if [ "$postgres_status" = "healthy" ] || [ "$postgres_status" = "Up" ]; then
            pg_symbol="🟢"
        fi
        
        if [ "$redis_status" = "healthy" ] || [ "$redis_status" = "Up" ]; then
            redis_symbol="🟢"
        fi
        
        echo "${pg_symbol} PostgreSQL ${redis_symbol} Redis"
    else
        echo "🔴 Docker 🔴 PostgreSQL 🔴 Redis"
    fi
}

# Function to stop servers
stop_servers() {
    local mode=$1
    
    case $mode in
        front)
            echo "🛑 Stopping frontend server"
            kill_port_processes $FRONTEND_PORT "frontend"
            ;;
        back)
            echo "🛑 Stopping backend server"
            kill_port_processes $BACKEND_PORT "backend"
            ;;
        full)
            echo "🛑 Stopping all development servers"
            kill_port_processes $FRONTEND_PORT "frontend"
            kill_port_processes $BACKEND_PORT "backend"
            ;;
    esac
    
    sleep 1
    show_condensed_status
}

# Function to start servers
start_servers() {
    local mode=$1
    
    # Clean log files first
    clean_logs $mode
    
    # Always stop existing servers first
    case $mode in
        front)
            kill_port_processes $FRONTEND_PORT "frontend"
            ;;
        back)
            kill_port_processes $BACKEND_PORT "backend"
            if ! check_docker_services; then
                echo "❌ Failed to start required Docker services"
                exit 1
            fi
            ;;
        full)
            kill_port_processes $FRONTEND_PORT "frontend"
            kill_port_processes $BACKEND_PORT "backend"
            if ! check_docker_services; then
                echo "❌ Failed to start required Docker services"
                exit 1
            fi
            ;;
    esac
    
    # Start requested servers
    case $mode in
        front)
            start_server "Frontend" $FRONTEND_PORT "$FRONTEND_COMMAND" "$FRONTEND_LOG"
            ;;
        back)
            start_server "Backend" $BACKEND_PORT "$BACKEND_COMMAND" "$BACKEND_LOG"
            ;;
        full)
            start_server "Backend" $BACKEND_PORT "$BACKEND_COMMAND" "$BACKEND_LOG"
            start_server "Frontend" $FRONTEND_PORT "$FRONTEND_COMMAND" "$FRONTEND_LOG"
            ;;
    esac
    
    # Wait a moment for servers to initialize
    sleep 2
    
    # Wait for servers to be ready
    case $mode in
        front)
            wait_for_server "Frontend" $FRONTEND_PORT
            ;;
        back)
            wait_for_server "Backend" $BACKEND_PORT
            ;;
        full)
            wait_for_server "Backend" $BACKEND_PORT &
            wait_for_server "Frontend" $FRONTEND_PORT &
            wait
            ;;
    esac
    
    # Show action message
    case $mode in
        front)
            echo "🚀 Starting frontend server"
            ;;
        back)
            echo "🚀 Starting backend server"
            ;;
        full)
            echo "🚀 Starting development servers"
            ;;
    esac
    
    # Wait a moment then show status
    sleep 2
    show_condensed_status
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <ACTION> <MODE>"
    echo ""
    echo "Actions:"
    echo "  start     Start the specified servers"
    echo "  stop      Stop the specified servers"  
    echo "  status    Show status of all servers (mode ignored)"
    echo "  help      Show this help"
    echo ""
    echo "Modes:"
    echo "  front     Frontend server only (port $FRONTEND_PORT)"
    echo "  back      Backend server only (port $BACKEND_PORT)"
    echo "  full      Both frontend and backend servers"
    echo ""
    echo "Examples:"
    echo "  $0 start front    # Start frontend only"
    echo "  $0 start back     # Start backend only"
    echo "  $0 start full     # Start both servers"
    echo "  $0 stop front     # Stop frontend only"
    echo "  $0 stop back      # Stop backend only"
    echo "  $0 stop full      # Stop both servers"
    echo "  $0 status         # Show status of both servers"
    echo ""
    echo "Default mode is 'full' if not specified."
    echo ""
}

# Parse command line arguments
ACTION=${1}
MODE=${2:-full}

# Validate arguments
case $ACTION in
    start|stop|status|help)
        ;;
    *)
        echo "❌ Invalid action: $ACTION"
        echo ""
        show_usage
        exit 1
        ;;
esac

case $MODE in
    front|back|full)
        ;;
    *)
        echo "❌ Invalid mode: $MODE"
        echo ""
        show_usage
        exit 1
        ;;
esac

# Execute the requested action
case $ACTION in
    start)
        start_servers $MODE
        ;;
    
    stop)
        stop_servers $MODE
        ;;
    
    status)
        show_status
        ;;
    
    help)
        show_usage
        ;;
esac

