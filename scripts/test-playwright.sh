#!/bin/bash

# Playwright Test Runner Script
# Runs UI tests with different browser configurations using Docker browsers

set -e

echo "🎭 Bomberman Playwright Test Runner"
echo "===================================="

# Configuration
PLAYWRIGHT_ENDPOINT="ws://127.0.0.1:9222/"
TEST_DIR="tests/front-end"

# Available projects (matching playwright.config.ts)
PROJECTS=(
  "Desktop Chrome - Basic UI"
  "Desktop Firefox - Basic UI"
  "Mobile Chrome - Basic UI"
  "Mobile Safari - Basic UI"
  "Desktop Chrome - Game UI"
  "Desktop Chrome - Integration Tests"
  "Desktop Firefox - Critical Flows"
  "Mobile Chrome - Mobile Flows"
  "Desktop Chrome - Admin Tests"
  "Desktop Chrome - System Integration"
)

# Function to show usage
show_usage() {
    echo ""
    echo "Usage: $0 [OPTIONS] [TEST_FILE]"
    echo ""
    echo "Options:"
    echo "  --project <name>     Run tests for specific project:"
    echo "                       - 'Desktop Chrome - Integration Tests'  (for e2e tests)"
    echo "                       - 'Desktop Chrome - Basic UI'           (for basic UI)"
    echo "                       - 'Desktop Chrome - Game UI'            (for game UI)"
    echo "                       - 'Desktop Chrome - Admin Tests'        (for admin)"
    echo "                       - 'Desktop Chrome - System Integration' (for system)"
    echo "                       - 'all' (default)"
    echo "  --headed             Run in headed mode (if supported)"
    echo "  --debug              Run in debug mode"
    echo "  --max-failures <n>   Stop after n failures (default: 1)"
    echo "  --reporter <type>    Reporter type: list, html, json"
    echo "  --help               Show this help"
    echo ""
    echo "Examples:"
    echo "  $0                                                          # Run all projects"
    echo "  $0 --project 'Desktop Chrome - Integration Tests'          # Integration tests"
    echo "  $0 uc-g001-join-game-room.integration.test.ts              # Specific test file"
    echo "  $0 --project 'Desktop Chrome - Basic UI' basic-ui.test.ts  # UI test in Chrome"
    echo "  $0 --debug --project 'Desktop Chrome - Integration Tests'  # Debug integration"
    echo ""
}

# Function to check if Docker Playwright server is running
check_playwright_server() {
    echo "🔍 Checking Playwright Docker server..."
    
    # Check if container is running
    if docker ps | grep -q bomberman-playwright-server; then
        echo "✅ Playwright server container is running"
        
        # Check if the server is listening (WebSocket endpoint)
        if docker logs bomberman-playwright-server 2>&1 | grep -q "Listening on ws://"; then
            echo "✅ Playwright server is listening"
            return 0
        else
            echo "⚠️  Container running but server not ready yet..."
        fi
    else
        echo "❌ Playwright server container not running"
        echo "💡 Starting Playwright server..."
        docker compose -f docker/playwright/docker-compose.yml up -d
    fi
    
    # Wait for server to be ready
    echo "⏳ Waiting for server to start..."
    for i in {1..30}; do
        if docker logs bomberman-playwright-server 2>&1 | grep -q "Listening on ws://"; then
            echo "✅ Playwright server is now running"
            return 0
        fi
        sleep 1
    done
    
    echo "❌ Failed to start Playwright server"
    echo "📋 Server logs:"
    docker logs bomberman-playwright-server
    return 1
}

# Function to run tests for a specific project
run_project_tests() {
    local project="$1"
    local test_file="$2"
    local extra_args="$3"
    
    echo ""
    echo "🚀 Running tests for: $project"
    echo "----------------------------------------"
    
    local cmd="PW_TEST_CONNECT_WS_ENDPOINT=$PLAYWRIGHT_ENDPOINT npx playwright test"
    
    if [ -n "$test_file" ]; then
        cmd="$cmd $TEST_DIR/$test_file"
    else
        cmd="$cmd $TEST_DIR"
    fi
    
    cmd="$cmd --project=\"$project\" $extra_args"
    
    echo "Command: $cmd"
    echo ""
    
    eval "$cmd"
}

# Parse command line arguments
PROJECT=""
TEST_FILE=""
HEADED=""
DEBUG=""
MAX_FAILURES="1"
REPORTER=""
EXTRA_ARGS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT="$2"
            shift 2
            ;;
        --headed)
            HEADED="--headed"
            shift
            ;;
        --debug)
            DEBUG="--debug"
            shift
            ;;
        --max-failures)
            MAX_FAILURES="$2"
            shift 2
            ;;
        --reporter)
            REPORTER="--reporter=$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *.test.ts)
            TEST_FILE="$1"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Build extra arguments
if [ -n "$HEADED" ]; then
    EXTRA_ARGS="$EXTRA_ARGS $HEADED"
fi

if [ -n "$DEBUG" ]; then
    EXTRA_ARGS="$EXTRA_ARGS $DEBUG"
fi

if [ -n "$MAX_FAILURES" ]; then
    EXTRA_ARGS="$EXTRA_ARGS --max-failures=$MAX_FAILURES"
fi

if [ -n "$REPORTER" ]; then
    EXTRA_ARGS="$EXTRA_ARGS $REPORTER"
fi

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if dev server is running
if ! curl -s "http://localhost:3000" > /dev/null 2>&1; then
    echo "⚠️  Dev server not running on port 3000"
    echo "💡 Start it with: npm run dev:client"
    exit 1
fi

# Check Playwright server
if ! check_playwright_server; then
    exit 1
fi

echo ""
echo "📋 Test Configuration:"
echo "  Project: ${PROJECT:-all}"
echo "  Test File: ${TEST_FILE:-all}"
echo "  Max Failures: $MAX_FAILURES"
echo "  Extra Args: $EXTRA_ARGS"
echo ""

# Run tests
if [ "$PROJECT" = "all" ] || [ -z "$PROJECT" ]; then
    echo "🎯 Running tests for all projects..."
    for project in "${PROJECTS[@]}"; do
        if ! run_project_tests "$project" "$TEST_FILE" "$EXTRA_ARGS"; then
            echo "❌ Tests failed for $project"
            if [ "$MAX_FAILURES" = "1" ]; then
                echo "🛑 Stopping due to max failures reached"
                break
            fi
        fi
    done
else
    # Validate project name
    valid_project=false
    for p in "${PROJECTS[@]}"; do
        if [ "$PROJECT" = "$p" ]; then
            valid_project=true
            break
        fi
    done
    
    if [ "$valid_project" = false ]; then
        echo "❌ Invalid project: $PROJECT"
        echo "Valid projects: ${PROJECTS[*]}"
        exit 1
    fi
    
    run_project_tests "$PROJECT" "$TEST_FILE" "$EXTRA_ARGS"
fi

echo ""
echo "✅ Test execution completed!"
echo "📊 Check ./test-results/ for detailed results"
echo "🌐 Check ./playwright-report/ for HTML report"