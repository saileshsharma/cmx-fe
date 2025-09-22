# CMX-FE Testing Guide

This document provides comprehensive guidance for Test-Driven Development (TDD) and testing practices in the CMX Frontend application.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Getting Started](#getting-started)
- [Testing Types](#testing-types)
- [Writing Tests](#writing-tests)
- [Running Tests](#running-tests)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The CMX Frontend follows a comprehensive testing strategy that includes:

- **Unit Tests**: Testing individual components and functions in isolation
- **Integration Tests**: Testing GraphQL queries and component interactions
- **End-to-End (E2E) Tests**: Testing complete user workflows
- **Visual Tests**: Ensuring UI consistency across different viewports

## Testing Stack

### Core Testing Framework
- **[Vitest](https://vitest.dev/)**: Fast unit test runner with native TypeScript support
- **[React Testing Library](https://testing-library.com/react)**: Component testing utilities
- **[@testing-library/jest-dom](https://testing-library.com/docs/ecosystem-jest-dom/)**: Custom Jest matchers for DOM testing

### E2E Testing
- **[Playwright](https://playwright.dev/)**: Modern E2E testing framework
- **Multi-browser support**: Chrome, Firefox, Safari, Edge

### Mocking & Test Data
- **[MSW (Mock Service Worker)](https://mswjs.io/)**: API mocking for integration tests
- **[@apollo/client/testing](https://www.apollographql.com/docs/react/development-testing/testing/)**: GraphQL query mocking

### Code Coverage
- **[@vitest/coverage-v8](https://vitest.dev/guide/coverage.html)**: V8 coverage provider
- **Coverage thresholds**: 80% for branches, functions, lines, and statements

## Getting Started

### 1. Install Dependencies

All testing dependencies are already configured. If you need to reinstall:

```bash
npm install
```

### 2. Run Tests

```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run integration tests
npm run test:integration

# Run E2E tests
npm run playwright

# Run all tests
npm run test:all
```

### 3. Generate Coverage Report

```bash
npm run test:coverage
```

## Testing Types

### Unit Tests

**Location**: `src/**/*.test.{ts,tsx}`

Unit tests focus on testing individual components, functions, and utilities in isolation.

#### Example: Component Test

```typescript
// src/components/Modal.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import Modal from './Modal'

describe('Modal Component', () => {
  it('renders the open modal button', () => {
    render(<Modal />)

    const openButton = screen.getByRole('button', { name: /open modal/i })
    expect(openButton).toBeInTheDocument()
  })

  it('shows modal when open button is clicked', () => {
    render(<Modal />)

    const openButton = screen.getByRole('button', { name: /open modal/i })
    fireEvent.click(openButton)

    expect(screen.getByText('Modal Title')).toBeInTheDocument()
  })
})
```

### Integration Tests

**Location**: `src/test/integration/**/*.test.ts`

Integration tests verify that different parts of the application work together correctly, particularly focusing on GraphQL operations.

#### Example: GraphQL Integration Test

```typescript
// src/test/integration/graphql-queries.test.ts
import { describe, it, expect } from 'vitest'
import { createTestApolloClient } from '../utils'
import { GET_POLICY_BY_NUMBER } from '../../graphql/policies'

describe('Policy Queries', () => {
  it('should fetch policy by number successfully', async () => {
    const client = createTestApolloClient()

    const { data } = await client.query({
      query: GET_POLICY_BY_NUMBER,
      variables: { policyNumber: 'THAUTO0000228' },
    })

    expect(data.getPolicyByNumber).toBeDefined()
    expect(data.getPolicyByNumber.policyNumber).toBe('THAUTO0000228')
  })
})
```

### End-to-End Tests

**Location**: `tests/**/*.spec.ts`

E2E tests verify complete user workflows from start to finish.

#### Example: E2E Test

```typescript
// tests/fnol.spec.ts
import { test, expect } from '@playwright/test'

test('should create FNOL successfully', async ({ page }) => {
  await page.goto('/create-fnol')

  // Search for policy
  await page.fill('input[type="text"]', 'THAUTO0000228')
  await page.click('button:has-text("View")')

  // Wait for policy data
  await page.waitForTimeout(2000)

  // Verify policy information is displayed
  await expect(page.locator('text=THAUTO0000228')).toBeVisible()
})
```

## Writing Tests

### Test File Naming

- Unit tests: `ComponentName.test.tsx` or `functionName.test.ts`
- Integration tests: `feature-name.test.ts`
- E2E tests: `feature-name.spec.ts`

### Test Structure

Follow the Arrange-Act-Assert (AAA) pattern:

```typescript
describe('Feature Name', () => {
  it('should do something when condition is met', () => {
    // Arrange: Set up test data and conditions
    const testData = createTestData()

    // Act: Perform the action being tested
    const result = performAction(testData)

    // Assert: Verify the expected outcome
    expect(result).toBe(expectedValue)
  })
})
```

### Testing Components with GraphQL

Use the provided test utilities for components that use GraphQL:

```typescript
import { render, screen } from '@/test/utils'
import { MockedProvider } from '@apollo/client/testing'

const mocks = [
  {
    request: {
      query: GET_POLICY_BY_NUMBER,
      variables: { policyNumber: 'TEST123' },
    },
    result: {
      data: {
        getPolicyByNumber: mockPolicyData,
      },
    },
  },
]

test('renders policy data', async () => {
  render(
    <MockedProvider mocks={mocks}>
      <PolicyComponent policyNumber="TEST123" />
    </MockedProvider>
  )

  await waitFor(() => {
    expect(screen.getByText('Policy Details')).toBeInTheDocument()
  })
})
```

### Mock Data Factories

Use the provided mock data factories for consistent test data:

```typescript
import { createMockPolicy, createMockClaim } from '@/test/utils'

const policy = createMockPolicy({
  policyNumber: 'CUSTOM123',
  policyStatus: 'BIND',
})

const claim = createMockClaim({
  claimNumber: 'CL-001',
  claimStatus: 'OPEN',
})
```

## Running Tests

### Development Workflow

1. **Watch Mode**: Run tests continuously during development
   ```bash
   npm run test:watch
   ```

2. **Specific Files**: Run tests for specific files
   ```bash
   npm run test Modal.test.tsx
   ```

3. **Coverage**: Check test coverage
   ```bash
   npm run test:coverage
   ```

### CI/CD Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run playwright

# Complete test suite
npm run test:all
```

### Playwright Commands

```bash
# Run E2E tests
npm run playwright

# Run with UI mode
npm run playwright:ui

# Debug tests
npm run playwright:debug

# View test report
npm run playwright:report

# Install browsers
npm run playwright:install
```

## CI/CD Integration

### GitHub Actions

The project includes a GitHub Actions workflow (`.github/workflows/test.yml`) that:

1. Runs tests on multiple Node.js versions (18.x, 20.x)
2. Performs type checking and linting
3. Executes unit and integration tests
4. Generates coverage reports
5. Runs E2E tests with Playwright
6. Uploads test artifacts

### Pre-commit Hooks

Git hooks are configured with Husky to run:
- Type checking
- Linting
- Unit tests
- Coverage checks

Enable hooks:
```bash
npm run prepare
```

## Best Practices

### 1. Test Naming

- Use descriptive test names that explain the behavior being tested
- Follow the pattern: "should [expected behavior] when [condition]"
- Group related tests in `describe` blocks

### 2. Test Isolation

- Each test should be independent and not rely on other tests
- Use `beforeEach` and `afterEach` for setup and cleanup
- Mock external dependencies

### 3. Accessibility Testing

- Test with screen readers in mind
- Use semantic queries (getByRole, getByLabelText)
- Verify ARIA attributes and keyboard navigation

### 4. Performance Testing

- Test loading states and error conditions
- Verify that components handle large datasets
- Test responsive behavior

### 5. Error Handling

- Test error states and edge cases
- Verify error messages are user-friendly
- Test network failure scenarios

### 6. Code Coverage

- Aim for 80%+ coverage but focus on quality over quantity
- Cover critical user paths and business logic
- Don't test implementation details

## Troubleshooting

### Common Issues

#### 1. Tests Timing Out

```typescript
// Increase timeout for slow operations
test('slow operation', async () => {
  // ...
}, 10000) // 10 second timeout
```

#### 2. GraphQL Mocking Issues

Ensure mock data structure matches your GraphQL schema:

```typescript
const mocks = [
  {
    request: {
      query: YOUR_QUERY,
      variables: { /* exact variables */ },
    },
    result: {
      data: {
        /* data structure must match schema */
      },
    },
  },
]
```

#### 3. Component Not Rendering

Check if all required providers are included:

```typescript
import { render } from '@/test/utils' // Includes all providers

// Or manually wrap with providers
render(
  <ApolloProvider client={testClient}>
    <BrowserRouter>
      <Component />
    </BrowserRouter>
  </ApolloProvider>
)
```

#### 4. Playwright Browser Issues

```bash
# Reinstall browsers
npm run playwright:install

# Run in headed mode for debugging
npx playwright test --headed

# Use debug mode
npm run playwright:debug
```

### Debug Tips

1. **Use screen.debug()** to see rendered HTML
2. **Add data-testid** attributes for reliable element selection
3. **Use waitFor()** for asynchronous operations
4. **Check network calls** in browser dev tools during E2E tests

## Test Coverage Goals

| Type | Threshold | Description |
|------|-----------|-------------|
| Statements | 80% | Individual executable statements |
| Branches | 80% | Conditional branches (if/else) |
| Functions | 80% | Function/method definitions |
| Lines | 80% | Physical lines of code |

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Apollo Client Testing](https://www.apollographql.com/docs/react/development-testing/testing/)

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update documentation as needed
5. Follow the established patterns and conventions

For questions or issues with testing, please refer to this documentation or reach out to the development team.