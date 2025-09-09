import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, DEFAULT_PAGE_NUMBER } from '../src/constants'

describe('Constants', () => {
  describe('Pagination Constants', () => {
    it('should have correct default page limit', () => {
      expect(DEFAULT_PAGE_LIMIT).toBe(20)
      expect(typeof DEFAULT_PAGE_LIMIT).toBe('number')
    })

    it('should have correct max page limit', () => {
      expect(MAX_PAGE_LIMIT).toBe(100)
      expect(typeof MAX_PAGE_LIMIT).toBe('number')
    })

    it('should have correct default page number', () => {
      expect(DEFAULT_PAGE_NUMBER).toBe(1)
      expect(typeof DEFAULT_PAGE_NUMBER).toBe('number')
    })

    it('should have max limit greater than default limit', () => {
      expect(MAX_PAGE_LIMIT).toBeGreaterThan(DEFAULT_PAGE_LIMIT)
    })

    it('should have positive values for all constants', () => {
      expect(DEFAULT_PAGE_LIMIT).toBeGreaterThan(0)
      expect(MAX_PAGE_LIMIT).toBeGreaterThan(0)
      expect(DEFAULT_PAGE_NUMBER).toBeGreaterThan(0)
    })

    it('should have reasonable limits for API usage', () => {
      // Default limit should be reasonable for most use cases
      expect(DEFAULT_PAGE_LIMIT).toBeGreaterThanOrEqual(10)
      expect(DEFAULT_PAGE_LIMIT).toBeLessThanOrEqual(50)
      
      // Max limit should prevent excessive resource usage
      expect(MAX_PAGE_LIMIT).toBeLessThanOrEqual(1000)
      
      // Page numbering should start at 1 (user-friendly)
      expect(DEFAULT_PAGE_NUMBER).toBe(1)
    })

    it('should be immutable number constants', () => {
      // These should be number primitives, not objects
      expect(typeof DEFAULT_PAGE_LIMIT).toBe('number')
      expect(typeof MAX_PAGE_LIMIT).toBe('number')
      expect(typeof DEFAULT_PAGE_NUMBER).toBe('number')
      
      // Should not be NaN
      expect(DEFAULT_PAGE_LIMIT).not.toBeNaN()
      expect(MAX_PAGE_LIMIT).not.toBeNaN()
      expect(DEFAULT_PAGE_NUMBER).not.toBeNaN()
      
      // Should be finite numbers
      expect(Number.isFinite(DEFAULT_PAGE_LIMIT)).toBe(true)
      expect(Number.isFinite(MAX_PAGE_LIMIT)).toBe(true)
      expect(Number.isFinite(DEFAULT_PAGE_NUMBER)).toBe(true)
    })
  })
})