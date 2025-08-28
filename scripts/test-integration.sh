#!/bin/bash

# Integration Test Runner Script
# Runs comprehensive integration tests for all use cases and system flows

set -e

echo "🧪 Bomberman Integration Test Runner"
echo "===================================="

# Configuration
PLAYWRIGHT_ENDPOINT="ws://127.0.0.1:9222/"
TEST_DIR="tests/front-end/integration"
RESULTS_DIR="test-results/integration"

# Test categories
declare -A TEST_CATEGORIES=(
    ["gamer"]="uc-g*.integration.test.ts"
    ["admin"]="uc-a*.integration.test.ts" 
    ["system"]="websocket-*.integration.test.ts"
    ["all"]="*.integration.test.ts"
)

# Available projects for integration tests
INTEGRATION_PROJECTS=(
    "Desktop Chrome - Integration Tests"
    "Desktop Firefox - Critical Flows"
    "Mobile Chrome - Mobile Flows"
    "Desktop Chrome - Admin Tests"
    "Desktop Chrome - System Integration"
)

# Function to show usage
show_usage() {
    echo ""
    echo "Usage: $0 [OPTIONS] [CATEGORY] [TEST_FILE]"
    echo ""
    echo "Categories:"
    echo "  gamer     Run gamer use case tests (UC-G001 to UC-G010)"
    echo "  admin     Run admin use case tests (UC-A001 to UC-A005)"
    echo "  system    Run system integration tests (WebSocket, Redis, etc.)"
    echo "  all       Run all integration tests (default)"
    echo ""
    echo "Options:"
    echo "  --headed              Run in headed mode"
    echo "  --debug              Run in debug mode"
    echo "  --project <name>     Run specific project only"
    echo "  --parallel <n>       Set number of parallel workers"
    echo "  --reporter <type>    Reporter: html, json, junit"
    echo "  --timeout <ms>       Override test timeout"
    echo "  --help               Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 gamer                          # Run all gamer use cases"
    echo "  $0 admin --headed                 # Run admin tests in headed mode"
    echo "  $0 system --debug                 # Debug system integration tests"
    echo "  $0 all --reporter html            # Run all tests with HTML report"
    echo "  $0 --project 'Desktop Chrome'     # Run tests on Chrome only"
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if dev server is running
    if ! curl -s "http://localhost:3000" > /dev/null 2>&1; then
        echo "⚠️  Dev server not running on port 3000"
        echo "💡 Start it with: ./scripts/start-dev.sh start front"
        exit 1
    fi
    
    # Check Playwright server
    if ! docker ps | grep -q bomberman-playwright-server; then
        echo "⚠️  Playwright server not running"
        echo "💡 Starting Playwright server..."
        docker compose -f docker/playwright/docker-compose.yml up -d
        sleep 5
    fi
    
    echo "✅ All prerequisites satisfied"
}

# Function to run integration tests
run_integration_tests() {
    local category=$1
    local test_file=$2
    local extra_args=$3
    
    echo ""
    echo "🧪 Running integration tests: $category"
    echo "========================================"
    
    # Prepare test pattern
    local test_pattern="${TEST_CATEGORIES[$category]:-$category}"
    
    if [ -n "$test_file" ]; then
        test_pattern="$test_file"
    fi
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Build command
    local cmd="PW_TEST_CONNECT_WS_ENDPOINT=$PLAYWRIGHT_ENDPOINT npx playwright test"
    cmd="$cmd $TEST_DIR/$test_pattern"
    cmd="$cmd --output=$RESULTS_DIR"
    cmd="$cmd $extra_args"
    
    echo "Command: $cmd"
    echo ""
    
    # Execute tests
    if eval "$cmd"; then
        echo "✅ Integration tests passed!"
        return 0
    else
        echo "❌ Integration tests failed!"
        return 1
    fi
}

# Function to run specific project tests
run_project_tests() {
    local project=$1
    local category=$2
    local extra_args=$3
    
    echo ""
    echo "🎯 Running tests for project: $project"
    echo "=====================================`echo $project | sed 's/./=/g'`"
    
    local test_pattern="${TEST_CATEGORIES[$category]:-*.integration.test.ts}"
    
    local cmd="PW_TEST_CONNECT_WS_ENDPOINT=$PLAYWRIGHT_ENDPOINT npx playwright test"
    cmd="$cmd $TEST_DIR/$test_pattern"
    cmd="$cmd --project=\"$project\""
    cmd="$cmd --output=$RESULTS_DIR"
    cmd="$cmd $extra_args"
    
    echo "Command: $cmd"
    echo ""
    
    eval "$cmd"
}

# Function to generate test report summary
generate_summary() {
    echo ""
    echo "📊 Integration Test Summary"
    echo "=========================="
    
    if [ -f "$RESULTS_DIR/results.json" ]; then
        # Extract key metrics from results
        local total_tests=$(jq '.stats.expected + .stats.unexpected + .stats.skipped' "$RESULTS_DIR/results.json" 2>/dev/null || echo "N/A")
        local passed_tests=$(jq '.stats.expected' "$RESULTS_DIR/results.json" 2>/dev/null || echo "N/A")
        local failed_tests=$(jq '.stats.unexpected' "$RESULTS_DIR/results.json" 2>/dev/null || echo "N/A")
        local skipped_tests=$(jq '.stats.skipped' "$RESULTS_DIR/results.json" 2>/dev/null || echo "N/A")
        
        echo "📈 Total Tests: $total_tests"
        echo "✅ Passed: $passed_tests"
        echo "❌ Failed: $failed_tests"
        echo "⏭️  Skipped: $skipped_tests"
    fi
    
    # Show available reports
    if [ -d "$RESULTS_DIR" ]; then
        echo ""
        echo "📋 Available Reports:"
        find "$RESULTS_DIR" -name "*.html" -o -name "*.json" -o -name "*.xml" | sort
    fi
    
    echo ""
    echo "🌐 To view HTML report: npx playwright show-report $RESULTS_DIR"
}

# Parse command line arguments
CATEGORY="all"
TEST_FILE=""
PROJECT=""
EXTRA_ARGS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --headed)
            EXTRA_ARGS="$EXTRA_ARGS --headed"
            shift
            ;;
        --debug)
            EXTRA_ARGS="$EXTRA_ARGS --debug"
            shift
            ;;
        --project)
            PROJECT="$2"
            shift 2
            ;;
        --parallel)
            EXTRA_ARGS="$EXTRA_ARGS --workers=$2"
            shift 2
            ;;
        --reporter)
            EXTRA_ARGS="$EXTRA_ARGS --reporter=$2"
            shift 2
            ;;
        --timeout)
            EXTRA_ARGS="$EXTRA_ARGS --timeout=$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        gamer|admin|system|all)
            CATEGORY="$1"
            shift
            ;;
        *.integration.test.ts)
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

# Main execution
echo "🎯 Category: $CATEGORY"
echo "🗄️  Test file: ${TEST_FILE:-all}"
echo "🖥️  Project: ${PROJECT:-all projects}"
echo "⚙️  Extra args: $EXTRA_ARGS"
echo ""

# Check prerequisites
check_prerequisites

# Run tests
if [ -n "$PROJECT" ]; then
    # Run for specific project
    if ! run_project_tests "$PROJECT" "$CATEGORY" "$EXTRA_ARGS"; then
        exit 1
    fi
else
    # Run for all appropriate projects
    case $CATEGORY in
        gamer)
            echo "🎮 Running gamer use case integration tests..."
            for project in "${INTEGRATION_PROJECTS[@]}"; do
                if [[ $project == *"Integration Tests"* ]] || [[ $project == *"Critical Flows"* ]] || [[ $project == *"Mobile Flows"* ]]; then
                    run_project_tests "$project" "$CATEGORY" "$EXTRA_ARGS" || true
                fi
            done
            ;;
        admin)
            echo "👨‍💼 Running admin use case integration tests..."
            run_project_tests "Desktop Chrome - Admin Tests" "$CATEGORY" "$EXTRA_ARGS"
            ;;
        system)
            echo "🔧 Running system integration tests..."
            run_project_tests "Desktop Chrome - System Integration" "$CATEGORY" "$EXTRA_ARGS"
            ;;
        all)
            echo "🌐 Running all integration tests..."
            if ! run_integration_tests "$CATEGORY" "$TEST_FILE" "$EXTRA_ARGS"; then
                exit 1
            fi
            ;;
    esac
fi

# Generate summary
generate_summary

echo ""
echo "✅ Integration test execution completed!"