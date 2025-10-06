import { 
  listQuerySchema, 
  eventSchema, 
  createEventSchema, 
  updateEventSchema,
  cityEnum
} from '../src/validation'

describe('Validation Schemas', () => {
  describe('cityEnum', () => {
    it('should accept valid cities', () => {
      const validCities = ['bogota', 'medellin', 'cali', 'barranquilla', 'cartagena']
      
      validCities.forEach(city => {
        const result = cityEnum.safeParse(city)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(city)
        }
      })
    })

    it('should reject invalid cities', () => {
      const invalidCities = ['madrid', 'paris', 'new-york', '']
      
      invalidCities.forEach(city => {
        const result = cityEnum.safeParse(city)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('listQuerySchema', () => {
    it('should validate empty query parameters', () => {
      const result = listQuerySchema.safeParse({})
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('should validate valid query parameters', () => {
      const validQuery = {
        city: 'bogota',
        category: 'musica',
        q: 'festival',
        from: '2024-01-01',
        to: '2024-12-31',
        minPrice: '50000',
        maxPrice: '100000',
        page: '2',
        limit: '10',
        sort: 'date',
        order: 'desc'
      }

      const result = listQuerySchema.safeParse(validQuery)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          city: 'bogota',
          category: 'musica',
          q: 'festival',
          from: '2024-01-01',
          to: '2024-12-31',
          minPrice: 50000,
          maxPrice: 100000,
          page: 2,
          limit: 10,
          sort: 'date',
          order: 'desc'
        })
      }
    })

    it('should apply default values for page and limit', () => {
      const result = listQuerySchema.safeParse({ q: 'test' })
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('should reject invalid city', () => {
      const result = listQuerySchema.safeParse({ city: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('should reject search query that is too short', () => {
      const result = listQuerySchema.safeParse({ q: '' })
      expect(result.success).toBe(false)
    })

    it('should reject search query that is too long', () => {
      const longQuery = 'a'.repeat(201)
      const result = listQuerySchema.safeParse({ q: longQuery })
      expect(result.success).toBe(false)
    })

    it('should reject invalid date format', () => {
      const invalidDates = ['2024/01/01', '01-01-2024', '2024-1-1', 'invalid-date']
      
      invalidDates.forEach(date => {
        const result = listQuerySchema.safeParse({ from: date })
        expect(result.success).toBe(false)
      })
    })

    it('should accept valid date format', () => {
      const validDates = ['2024-01-01', '2024-12-31', '2025-06-15']
      
      validDates.forEach(date => {
        const result = listQuerySchema.safeParse({ from: date })
        expect(result.success).toBe(true)
      })
    })

    it('should coerce string numbers to numbers for price fields', () => {
      const result = listQuerySchema.safeParse({ minPrice: '50000', maxPrice: '100000' })
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.minPrice).toBe(50000)
        expect(result.data.maxPrice).toBe(100000)
      }
    })

    it('should reject negative prices', () => {
      const result = listQuerySchema.safeParse({ minPrice: '-1000' })
      expect(result.success).toBe(false)
    })

    it('should coerce string numbers for page and limit', () => {
      const result = listQuerySchema.safeParse({ page: '3', limit: '50' })
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(3)
        expect(result.data.limit).toBe(50)
      }
    })

    it('should reject page less than 1', () => {
      const result = listQuerySchema.safeParse({ page: '0' })
      expect(result.success).toBe(false)
    })

    it('should reject limit greater than max allowed', () => {
      const result = listQuerySchema.safeParse({ limit: '101' })
      expect(result.success).toBe(false)
    })

    it('should accept valid sort options', () => {
      const validSorts = ['date', 'price']
      
      validSorts.forEach(sort => {
        const result = listQuerySchema.safeParse({ sort })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid sort options', () => {
      const result = listQuerySchema.safeParse({ sort: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('should accept valid order options', () => {
      const validOrders = ['asc', 'desc']
      
      validOrders.forEach(order => {
        const result = listQuerySchema.safeParse({ order })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid order options', () => {
      const result = listQuerySchema.safeParse({ order: 'invalid' })
      expect(result.success).toBe(false)
    })
  })

  describe('eventSchema', () => {
    const validEvent = {
      title: 'Test Event',
      description: 'This is a test event with a detailed description.',
      date: '2024-12-01',
      time: '20:00',
      location: 'Test Venue',
      address: 'Test Address, City',
      category: 'musica',
      city: 'bogota',
      price: 50000,
      currency: 'COP',
      image: 'https://example.com/image.jpg'
    }

    it('should validate complete valid event', () => {
      const result = eventSchema.safeParse(validEvent)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toEqual([])
        expect(result.data.status).toBe('active')
      }
    })

    it('should apply default values for optional fields', () => {
      const minimalEvent = { ...validEvent }
      delete (minimalEvent as any).image
      
      const result = eventSchema.safeParse(minimalEvent)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toEqual([])
        expect(result.data.status).toBe('active')
      }
    })

    describe('title validation', () => {
      it('should reject title that is too short', () => {
        const result = eventSchema.safeParse({ ...validEvent, title: 'Ab' })
        expect(result.success).toBe(false)
      })

      it('should reject title that is too long', () => {
        const longTitle = 'A'.repeat(201)
        const result = eventSchema.safeParse({ ...validEvent, title: longTitle })
        expect(result.success).toBe(false)
      })

      it('should accept valid title lengths', () => {
        const validTitles = ['ABC', 'Valid Event Title', 'A'.repeat(200)]
        
        validTitles.forEach(title => {
          const result = eventSchema.safeParse({ ...validEvent, title })
          expect(result.success).toBe(true)
        })
      })
    })

    describe('description validation', () => {
      it('should reject description that is too short', () => {
        const result = eventSchema.safeParse({ ...validEvent, description: 'Too short' })
        expect(result.success).toBe(false)
      })

      it('should reject description that is too long', () => {
        const longDesc = 'A'.repeat(2001)
        const result = eventSchema.safeParse({ ...validEvent, description: longDesc })
        expect(result.success).toBe(false)
      })

      it('should accept valid description lengths', () => {
        const validDesc = 'This is a valid event description with enough detail.'
        const result = eventSchema.safeParse({ ...validEvent, description: validDesc })
        expect(result.success).toBe(true)
      })
    })

    describe('date validation', () => {
      it('should reject invalid date formats', () => {
        const invalidDates = ['2024/12/01', '01-12-2024', '2024-1-1', 'invalid']
        
        invalidDates.forEach(date => {
          const result = eventSchema.safeParse({ ...validEvent, date })
          expect(result.success).toBe(false)
        })
      })

      it('should accept valid date formats', () => {
        const validDates = ['2024-12-01', '2025-01-15', '2024-02-29']
        
        validDates.forEach(date => {
          const result = eventSchema.safeParse({ ...validEvent, date })
          expect(result.success).toBe(true)
        })
      })
    })

    describe('time validation', () => {
      it('should reject invalid time formats', () => {
        const invalidTimes = ['8:00', '20:5', 'invalid']
        
        invalidTimes.forEach(time => {
          const result = eventSchema.safeParse({ ...validEvent, time })
          expect(result.success).toBe(false)
        })
      })

      it('should accept time formats that match regex pattern', () => {
        // Note: The regex only validates format DD:DD, not actual time validity
        const validTimes = ['25:00', '20:60'] // These match the regex pattern
        
        validTimes.forEach(time => {
          const result = eventSchema.safeParse({ ...validEvent, time })
          expect(result.success).toBe(true)
        })
      })

      it('should accept valid time formats', () => {
        const validTimes = ['00:00', '12:30', '23:59', '08:15']
        
        validTimes.forEach(time => {
          const result = eventSchema.safeParse({ ...validEvent, time })
          expect(result.success).toBe(true)
        })
      })
    })

    describe('location validation', () => {
      it('should reject location that is too short', () => {
        const result = eventSchema.safeParse({ ...validEvent, location: 'A' })
        expect(result.success).toBe(false)
      })

      it('should reject location that is too long', () => {
        const longLocation = 'A'.repeat(201)
        const result = eventSchema.safeParse({ ...validEvent, location: longLocation })
        expect(result.success).toBe(false)
      })
    })

    describe('address validation', () => {
      it('should reject address that is too short', () => {
        const result = eventSchema.safeParse({ ...validEvent, address: 'A' })
        expect(result.success).toBe(false)
      })

      it('should reject address that is too long', () => {
        const longAddress = 'A'.repeat(201)
        const result = eventSchema.safeParse({ ...validEvent, address: longAddress })
        expect(result.success).toBe(false)
      })
    })

    describe('price validation', () => {
      it('should accept zero price (free events)', () => {
        const result = eventSchema.safeParse({ ...validEvent, price: 0 })
        expect(result.success).toBe(true)
      })

      it('should accept positive prices', () => {
        const result = eventSchema.safeParse({ ...validEvent, price: 100000 })
        expect(result.success).toBe(true)
      })

      it('should reject negative prices', () => {
        const result = eventSchema.safeParse({ ...validEvent, price: -1000 })
        expect(result.success).toBe(false)
      })
    })

    describe('currency validation', () => {
      it('should reject currency codes that are too short', () => {
        const result = eventSchema.safeParse({ ...validEvent, currency: 'CO' })
        expect(result.success).toBe(false)
      })

      it('should reject currency codes that are too long', () => {
        const result = eventSchema.safeParse({ ...validEvent, currency: 'COPS' })
        expect(result.success).toBe(false)
      })

      it('should accept valid currency codes', () => {
        const validCurrencies = ['COP', 'USD', 'EUR', 'GBP']
        
        validCurrencies.forEach(currency => {
          const result = eventSchema.safeParse({ ...validEvent, currency })
          expect(result.success).toBe(true)
        })
      })
    })

    describe('image validation', () => {
      it('should accept valid URLs', () => {
        const validUrls = [
          'https://example.com/image.jpg',
          'http://test.com/photo.png',
          'https://cdn.example.com/assets/image.gif'
        ]
        
        validUrls.forEach(url => {
          const result = eventSchema.safeParse({ ...validEvent, image: url })
          expect(result.success).toBe(true)
        })
      })

      it('should reject invalid URLs', () => {
        const invalidUrls = ['not-a-url', 'just-text']
        
        invalidUrls.forEach(url => {
          const result = eventSchema.safeParse({ ...validEvent, image: url })
          expect(result.success).toBe(false)
        })
      })

      it('should accept FTP URLs since zod URL validation allows them', () => {
        const result = eventSchema.safeParse({ ...validEvent, image: 'ftp://example.com/image.jpg' })
        expect(result.success).toBe(true)
      })

      it('should be optional', () => {
        const eventWithoutImage = { ...validEvent }
        delete (eventWithoutImage as any).image
        
        const result = eventSchema.safeParse(eventWithoutImage)
        expect(result.success).toBe(true)
      })
    })


    describe('status validation', () => {
      it('should accept all valid status values', () => {
        const validStatuses = ['active', 'cancelled', 'postponed', 'sold_out']
        
        validStatuses.forEach(status => {
          const result = eventSchema.safeParse({ ...validEvent, status })
          expect(result.success).toBe(true)
        })
      })

      it('should reject invalid status values', () => {
        const result = eventSchema.safeParse({ ...validEvent, status: 'invalid' })
        expect(result.success).toBe(false)
      })
    })

    describe('tags validation', () => {
      it('should accept array of strings', () => {
        const result = eventSchema.safeParse({ 
          ...validEvent, 
          tags: ['music', 'concert', 'live'] 
        })
        expect(result.success).toBe(true)
      })

      it('should default to empty array', () => {
        const result = eventSchema.safeParse(validEvent)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.tags).toEqual([])
        }
      })
    })
  })

  describe('createEventSchema', () => {
    it('should exclude id field from event schema', () => {
      const eventWithId = {
        id: 'some-id',
        title: 'Test Event',
        description: 'This is a test event with a detailed description.',
        date: '2024-12-01',
        time: '20:00',
        location: 'Test Venue',
        address: 'Test Address, City',
        category: 'musica',
        city: 'bogota',
        price: 50000,
        currency: 'COP'
      }

      const result = createEventSchema.safeParse(eventWithId)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('id')
      }
    })
  })

  describe('updateEventSchema', () => {
    it('should require id field', () => {
      const updateData = {
        title: 'Updated Title'
      }

      const result = updateEventSchema.safeParse(updateData)
      expect(result.success).toBe(false)
    })

    it('should accept id and partial event data', () => {
      const updateData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Updated Title',
        price: 75000
      }

      const result = updateEventSchema.safeParse(updateData)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('550e8400-e29b-41d4-a716-446655440000')
        expect(result.data.title).toBe('Updated Title')
        expect(result.data.price).toBe(75000)
      }
    })

    it('should reject invalid UUID format for id', () => {
      const updateData = {
        id: 'invalid-uuid',
        title: 'Updated Title'
      }

      const result = updateEventSchema.safeParse(updateData)
      expect(result.success).toBe(false)
    })

    it('should validate partial fields with same rules as create schema', () => {
      const updateData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'AB', // Too short
        price: -1000 // Negative
      }

      const result = updateEventSchema.safeParse(updateData)
      expect(result.success).toBe(false)
    })
  })
})