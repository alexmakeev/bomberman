#!/bin/bash

# Unified Development Server Manager
# Manages frontend, backend, or both servers with unified interface

set -e

echo "🎮 Bomberman Unified Development Server Manager"
echo "=============================================="

# Configuration
FRONTEND_PORT=3000
BACKEND_PORT=8080
FRONTEND_COMMAND="npm run dev:client"
BACKEND_COMMAND="npm run dev:server"

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

# Function to start a server in background
start_server() {
    local server_type=$1
    local port=$2
    local command=$3
    
    echo "🚀 Starting $server_type server..."
    echo "Command: $command"
    
    # Start in background
    nohup $command >/dev/null 2>&1 &
    local pid=$!
    
    echo "🎯 $server_type server started with PID: $pid"
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

# Function to show server status
show_server_status() {
    local server_type=$1
    local port=$2
    
    echo "📊 $server_type Server (Port $port):"
    if check_port $port; then
        echo "🟢 Server is running on port $port"
        echo "📋 Process details:"
        lsof -ti:$port | xargs ps -o pid,ppid,cmd -p 2>/dev/null || true
        echo "🌐 URL: http://localhost:$port"
        
        # Test if server is responding
        if curl -s "http://localhost:$port" >/dev/null 2>&1 || curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
            echo "✅ Server is responding to requests"
        else
            echo "⚠️  Server is not responding (may still be starting)"
        fi
    else
        echo "🔴 No server running on port $port"
    fi
    echo ""
}

# Function to show full status
show_status() {
    echo "📊 Development Environment Status"
    echo "--------------------------------"
    
    # Always show both server statuses
    show_server_status "Frontend" $FRONTEND_PORT
    show_server_status "Backend" $BACKEND_PORT
    
    # Show Docker services
    echo "🐳 Docker Services:"
    if docker info >/dev/null 2>&1; then
        docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No services running"
    else
        echo "❌ Docker is not running"
    fi
    echo ""
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
            start_server "Frontend" $FRONTEND_PORT "$FRONTEND_COMMAND"
            ;;
        back)
            start_server "Backend" $BACKEND_PORT "$BACKEND_COMMAND"
            ;;
        full)
            start_server "Backend" $BACKEND_PORT "$BACKEND_COMMAND"
            start_server "Frontend" $FRONTEND_PORT "$FRONTEND_COMMAND"
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
            ;;
        back)
            echo "🎮 Backend development server is running!"
            echo "💡 Backend: http://localhost:$BACKEND_PORT"
            ;;
        full)
            echo "🎮 Full development environment is running!"
            echo "💡 Frontend: http://localhost:$FRONTEND_PORT"
            echo "💡 Backend: http://localhost:$BACKEND_PORT"
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

echo "✅ Operation completed!"