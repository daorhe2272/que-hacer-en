// Jest setup file for API tests
import { jest } from '@jest/globals'

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    }
  }))
}))

// Mock database client
jest.mock('../src/db/client', () => ({
  query: jest.fn()
}))

// Set test environment
process.env.NODE_ENV = 'test'