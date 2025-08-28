#!/bin/bash

# UI Testing Script with Docker
# Runs Playwright tests in a containerized environment

set -e

echo "🎭 Bomberman UI Testing with Playwright + Docker"
echo "=================================================="

# Configuration
PLAYWRIGHT_DIR="docker/playwright"
CONTAINER_NAME="bomberman-playwright-tests"

# Functions
cleanup() {
    echo "🧹 Cleaning up..."
    docker compose -f $PLAYWRIGHT_DIR/docker-compose.yml down 2>/dev/null || true
}

# Trap cleanup on script exit
trap cleanup EXIT

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start containers
echo "🐳 Building Playwright test container..."
docker compose -f $PLAYWRIGHT_DIR/docker-compose.yml build

echo "🚀 Starting test environment..."
docker compose -f $PLAYWRIGHT_DIR/docker-compose.yml up -d

# Wait for container to be ready
echo "⏳ Waiting for test container to be ready..."
sleep 5

# Check if container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "❌ Test container failed to start"
    docker compose -f $PLAYWRIGHT_DIR/docker-compose.yml logs
    exit 1
fi

echo "✅ Test container is ready!"

# Run tests
echo "🧪 Running UI tests..."
if [ "$1" == "--interactive" ] || [ "$1" == "-i" ]; then
    echo "🔧 Entering interactive mode..."
    echo "You can now run: docker exec -it $CONTAINER_NAME /app/run-tests.sh"
    echo "Or run individual tests: docker exec -it $CONTAINER_NAME npx playwright test [options]"
    echo "Press Ctrl+C to exit"
    
    # Keep script running
    while true; do
        sleep 1
    done
else
    # Run tests and capture output
    docker exec $CONTAINER_NAME /app/run-tests.sh "$@"
    
    # Copy test results to host
    echo "📊 Copying test results..."
    docker cp $CONTAINER_NAME:/app/playwright-report ./playwright-report 2>/dev/null || echo "No HTML report generated"
    docker cp $CONTAINER_NAME:/app/test-results ./test-results 2>/dev/null || echo "No test results to copy"
    
    echo "✅ UI tests completed!"
    echo "📋 Check ./test-results/ for detailed results"
    echo "🌐 Check ./playwright-report/ for HTML report"
fi