# Test Coverage for Alert & Regression Pages

This directory contains comprehensive tests for the alert and regression analysis features to prevent regressions and ensure code quality.

## Test Files

### Utility Tests: `src/lib/__tests__/alert-utils.test.ts` (25 tests)
Tests all helper functions and parsers:
- ✅ `formatMetricValue()` - CLS vs time-based metrics, zero values
- ✅ `getMetricUnit()` - Correct units for different metrics
- ✅ `isSeverityLevel()` - Valid/invalid severity validation
- ✅ `isConfidenceLevel()` - Valid/invalid confidence validation
- ✅ `getSeverityInfo()` - Severity config lookup with fallbacks
- ✅ `getConfidenceInfo()` - Confidence config lookup with fallbacks
- ✅ `parseRegressionCauses()` - JSON parsing with validation
- ✅ `parseDiffSummary()` - JSON parsing with validation

### Component Tests: `src/components/__tests/`

#### `alert-card.test.tsx` (12 tests)
Tests the AlertCard component:
- ✅ Site name and URL rendering
- ✅ Metric name formatting (uppercase)
- ✅ Regression delta formatting
- ✅ Severity and confidence badges
- ✅ CLS vs time-based metric formatting
- ✅ Link to regression details
- ✅ Fallback handling for invalid data
- ✅ Date formatting

#### `empty-alerts.test.tsx` (5 tests)
Tests the EmptyAlerts component:
- ✅ Empty state message
- ✅ Singular/plural day messages
- ✅ Icon rendering

#### `regression-header.test.tsx` (14 tests)
Tests the RegressionHeader component:
- ✅ Metric name in uppercase
- ✅ Baseline, current, and delta values
- ✅ Percentage change display
- ✅ Severity and confidence badges
- ✅ CLS vs time-based formatting
- ✅ Unit display (ms vs no unit)
- ✅ Different severity levels
- ✅ Different confidence levels
- ✅ Zero value handling

#### `diff-summary-section.test.tsx` (19 tests)
Tests the DiffSummarySection component:
- ✅ Section title and description
- ✅ Network metrics (bytes, requests, JS size)
- ✅ New domains display
- ✅ Main thread metrics (total work, scripting, long tasks)
- ✅ Rendering metrics (LCP resource changes)
- ✅ Backend metrics (TTFB, server latency)
- ✅ Positive and negative deltas
- ✅ Conditional rendering

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/lib/__tests__/alert-utils.test.ts

# Run tests in watch mode
pnpm test --watch

# Run with coverage
pnpm test --coverage
```

## Coverage Goals

These tests provide:
- **100% coverage** of alert utility functions
- **Comprehensive coverage** of alert-related components
- **Edge case testing** for invalid data, zero values, and edge cases
- **Regression prevention** for formatting, links, and conditional rendering

## What's Tested

### ✅ Functionality
- Metric value formatting (CLS vs time-based)
- Severity and confidence badge colors
- JSON field parsing with fallbacks
- Link generation
- Conditional rendering

### ✅ Edge Cases
- Null/undefined values
- Invalid severity/confidence levels
- Zero values
- Negative deltas
- Empty arrays and objects

### ✅ User Experience
- Correct text formatting
- Proper units (ms, KB, etc.)
- Singular/plural grammar
- Badge variants and colors

## Maintenance

When adding new features:
1. Add corresponding tests
2. Run `pnpm test` to ensure all tests pass
3. Check coverage with `pnpm test --coverage`
4. Update this README if adding new test files
