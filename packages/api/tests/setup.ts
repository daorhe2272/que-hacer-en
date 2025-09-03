// Test setup file - runs before all tests
process.env.NODE_ENV = 'test'

// Clear DATABASE_URL to prevent real database connections in tests
delete process.env.DATABASE_URL

// Set test-specific Supabase URL for auth bypass
process.env.SUPABASE_URL = 'https://test.supabase.co'

// Only mock database client for tests that don't specifically need DB testing
// Other tests should override this as needed

// Mock console.error to reduce noise in test output
const originalConsoleError = console.error
console.error = (...args: any[]) => {
  // Only show non-test related errors
  if (!args.some(arg => typeof arg === 'string' && (
    arg.includes('boom') || 
    arg.includes('DB error') || 
    arg.includes('test')
  ))) {
    originalConsoleError(...args)
  }
}