import { jest } from '@jest/globals'

export function mockAuthentication(userId = 'user-1', email = 'user1@example.com', role: 'attendee' | 'organizer' | 'admin' = 'attendee') {
  // Mock jose library for JWT verification
  jest.doMock('jose', () => ({
    createRemoteJWKSet: jest.fn(() => ({} as any)),
    jwtVerify: jest.fn(async () => ({ 
      payload: { 
        sub: userId, 
        email, 
        user_role: role 
      } 
    }))
  }))
}

export function clearAllMocks() {
  jest.resetModules()
  // Clear the entire require cache to ensure fresh imports
  Object.keys(require.cache).forEach(key => {
    delete require.cache[key]
  })
}

export async function createMockedApp() {
  // Set required environment variables
  process.env.SUPABASE_URL = 'https://project.supabase.co'
  
  const app = (await import('../../src/index')).default
  return app
}

export async function createAuthenticatedApp(userId = 'user-1', email = 'user1@example.com', role: 'attendee' | 'organizer' | 'admin' = 'attendee') {
  clearAllMocks()
  mockAuthentication(userId, email, role)
  return createMockedApp()
}