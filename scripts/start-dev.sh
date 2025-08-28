#!/bin/bash

# Unified Development Server Manager
# Manages frontend, backend, or both servers with unified interface

set -e

# Only show header for non-status commands
if [ "${1:-}" != "status" ]; then
    echo "🎮 Bomberman Unified Development Server Manager"
    echo "=============================================="
fi

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
    echo "🔍 Checking for processes on port $port ($service_name)..."
    
    if check_port $port; then
        echo "⚠️  Found processes using port $port"
        echo "📋 Processes on port $port:"
        lsof -ti:$port | xargs ps -o pid,ppid,cmd -p 2>/dev/null || true
        
        echo "🛑 Killing processes on port $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        
        # Wait a moment for processes to terminate
        sleep 1
        
        # Verify port is now free
        if check_port $port; then
            echo "❌ Failed to free port $port"
            echo "📋 Remaining processes:"
            lsof -ti:$port | xargs ps -o pid,ppid,cmd -p 2>/dev/null || true
            return 1
        else
            echo "✅ Port $port is now free"
        fi
    else
        echo "✅ Port $port is available"
    fi
    return 0
}

# Function to check Docker services
check_docker_services() {
    echo "🐳 Checking Docker services..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker first."
        return 1
    fi
    
    # Check required services for backend
    local required_services=("bomberman-postgres" "bomberman-redis")
    local missing_services=()
    
    for service in "${required_services[@]}"; do
        if ! docker ps --format "table {{.Names}}" | grep -q "^$service$"; then
            missing_services+=("$service")
        fi
    done
    
    if [ ${#missing_services[@]} -gt 0 ]; then
        echo "⚠️  Missing Docker services: ${missing_services[*]}"
        echo "🚀 Starting Docker services..."
        docker compose up -d >/dev/null 2>&1
        
        # Wait for services to be healthy
        echo "⏳ Waiting for services to be ready..."
        for i in {1..15}; do
            all_healthy=true
            for service in "${required_services[@]}"; do
                if ! docker ps --format "table {{.Names}}\t{{.Status}}" | grep "^$service" | grep -q "healthy"; then
                    all_healthy=false
                    break
                fi
            done
            
            if [ "$all_healthy" = true ]; then
                echo "✅ All Docker services are healthy"
                return 0
            fi
            
            sleep 2
        done
        
        echo "❌ Docker services failed to become healthy in time"
        return 1
    else
        echo "✅ All required Docker services are running"
    fi
    
    return 0
}

# Function to clean log files
clean_logs() {
    local mode=$1
    
    case $mode in
        front)
            echo "🧹 Cleaning frontend log file..."
            > "$FRONTEND_LOG"
            ;;
        back)
            echo "🧹 Cleaning backend log file..."
            > "$BACKEND_LOG"
            ;;
        full)
            echo "🧹 Cleaning all log files..."
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
    
    echo "🚀 Starting $server_type server..."
    echo "Command: $command"
    echo "📝 Logs: $log_file"
    
    # Start in background with logging
    nohup $command >> "$log_file" 2>&1 &
    local pid=$!
    
    echo "🎯 $server_type server started with PID: $pid"
    echo "💡 View logs with: tail -f $log_file"
    return 0
}

# Function to wait for server to be ready
wait_for_server() {
    local server_type=$1
    local port=$2
    local max_attempts=15
    
    echo "⏳ Waiting for $server_type server to be ready on port $port..."
    
    for i in $(seq 1 $max_attempts); do
        if curl -s "http://localhost:$port" >/dev/null 2>&1; then
            echo "✅ $server_type server is ready!"
            return 0
        elif curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
            echo "✅ $server_type server is ready!"
            return 0
        fi
        sleep 1
    done
    
    echo "⚠️  $server_type server may still be starting up..."
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

# Function to stop servers
stop_servers() {
    local mode=$1
    
    case $mode in
        front)
            echo "🛑 Stopping frontend server..."
            kill_port_processes $FRONTEND_PORT "frontend"
            ;;
        back)
            echo "🛑 Stopping backend server..."
            kill_port_processes $BACKEND_PORT "backend"
            ;;
        full)
            echo "🛑 Stopping all development servers..."
            kill_port_processes $FRONTEND_PORT "frontend"
            kill_port_processes $BACKEND_PORT "backend"
            ;;
    esac
}

# Function to start servers
start_servers() {
    local mode=$1
    
    # Clean log files first
    clean_logs $mode
    
    # Always stop existing servers first
    echo "🧹 Cleaning up existing processes..."
    case $mode in
        front)
            kill_port_processes $FRONTEND_PORT "frontend"
            ;;
        back)
            kill_port_processes $BACKEND_PORT "backend"
            # Ensure Docker services are running for backend
            if ! check_docker_services; then
                echo "❌ Failed to start required Docker services for backend"
                exit 1
            fi
            ;;
        full)
            kill_port_processes $FRONTEND_PORT "frontend"
            kill_port_processes $BACKEND_PORT "backend"
            # Ensure Docker services are running for backend
            if ! check_docker_services; then
                echo "❌ Failed to start required Docker services for backend"
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
    
    # Show final status
    show_status
    
    # Success message
    case $mode in
        front)
            echo "🎮 Frontend development server is running!"
            echo "💡 Frontend: http://localhost:$FRONTEND_PORT"
            echo "📝 Frontend logs: tail -f $FRONTEND_LOG"
            ;;
        back)
            echo "🎮 Backend development server is running!"
            echo "💡 Backend: http://localhost:$BACKEND_PORT"
            echo "📝 Backend logs: tail -f $BACKEND_LOG"
            ;;
        full)
            echo "🎮 Full development environment is running!"
            echo "💡 Frontend: http://localhost:$FRONTEND_PORT"
            echo "💡 Backend: http://localhost:$BACKEND_PORT"
            echo "📝 Frontend logs: tail -f $FRONTEND_LOG"
            echo "📝 Backend logs: tail -f $BACKEND_LOG"
            ;;
    esac
    
    echo "🛑 To stop: $0 stop $mode"
    echo "📊 To check status: $0 status"
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
        echo "🎯 Starting development environment in '$MODE' mode..."
        start_servers $MODE
        ;;
    
    stop)
        echo "🛑 Stopping development environment in '$MODE' mode..."
        stop_servers $MODE
        show_status
        ;;
    
    status)
        show_status
        ;;
    
    help)
        show_usage
        ;;
esac

# Only show completion message for non-status commands
if [ "$ACTION" != "status" ]; then
    echo "✅ Operation completed!"
fi