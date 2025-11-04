#!/bin/bash

# Playwright Test Runner with Detailed Reporting
# Usage: ./test-and-report.sh

echo "🧪 Starting Playwright E2E Tests for Registry..."
echo "================================================"
echo ""

# Create test results directory
mkdir -p test-results

# Run tests with HTML reporter
echo "📊 Running tests..."
npx playwright test --reporter=html,line

# Capture exit code
TEST_EXIT_CODE=$?

# Generate summary
echo ""
echo "================================================"
echo "📈 Test Summary"
echo "================================================"

# Count passed and failed tests
PASSED=$(grep -o "passed" test-results/*.txt 2>/dev/null | wc -l | tr -d ' ')
FAILED=$(grep -o "failed" test-results/*.txt 2>/dev/null | wc -l | tr -d ' ')

echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo ""

# Show test report location
echo "📄 Detailed HTML report: playwright-report/index.html"
echo "📸 Screenshots saved in: test-results/"
echo ""

# Open HTML report (macOS)
if [ "$TEST_EXIT_CODE" -ne 0 ]; then
    echo "⚠️  Some tests failed. Opening HTML report..."
    open playwright-report/index.html 2>/dev/null || echo "Run 'npx playwright show-report' to view report"
else
    echo "🎉 All tests passed!"
fi

echo ""
echo "================================================"
echo "🔍 Quick Debug Commands:"
echo "================================================"
echo "View HTML report:       npx playwright show-report"
echo "Run tests in UI mode:   npx playwright test --ui"
echo "Run specific test:      npx playwright test -g \"test name\""
echo "Debug failed tests:     npx playwright test --debug"
echo ""

exit $TEST_EXIT_CODE
