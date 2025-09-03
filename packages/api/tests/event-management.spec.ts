import request from 'supertest'
import app from '../src'
import { createEventDb, getEventByIdDb, updateEventDb, deleteEventDb, listOrganizerEventsDb } from '../src/db/repository'

// Mock the database functions
jest.mock('../src/db/repository', () => ({
  ...jest.requireActual('../src/db/repository'),
  createEventDb: jest.fn(),
  getEventByIdDb: jest.fn(),
  updateEventDb: jest.fn(),
  deleteEventDb: jest.fn(),
  listOrganizerEventsDb: jest.fn()
}))

const mockCreateEventDb = createEventDb as jest.MockedFunction<typeof createEventDb>
const mockGetEventByIdDb = getEventByIdDb as jest.MockedFunction<typeof getEventByIdDb>
const mockUpdateEventDb = updateEventDb as jest.MockedFunction<typeof updateEventDb>
const mockDeleteEventDb = deleteEventDb as jest.MockedFunction<typeof deleteEventDb>
const mockListOrganizerEventsDb = listOrganizerEventsDb as jest.MockedFunction<typeof listOrganizerEventsDb>

// Mock JWT validation to simulate authenticated user
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-123', email: 'organizer@example.com', role: 'organizer' }
    next()
  },
  requireRole: (...roles: string[]) => (req: any, res: any, next: any) => {
    if (roles.includes(req.user?.role)) {
      next()
    } else {
      res.status(403).json({ error: 'Forbidden' })
    }
  }
}))

describe('Event Management API (Authenticated Routes)', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/events (Create Event)', () => {
    const validEventData = {
      title: 'Test Event',
      description: 'A test event',
      date: '2024-12-01',
      time: '20:00',
      location: 'Test Venue',
      address: 'Test Address',
      category: 'musica',
      price: 50000,
      currency: 'COP',
      image: 'https://example.com/image.jpg',
      organizer: 'Test Organizer',
      capacity: 100,
      tags: ['test'],
      status: 'active',
      city: 'bogota'
    }

    it('should create event successfully', async () => {
      const createdEvent = { id: '550e8400-e29b-41d4-a716-446655440000', ...validEventData }
      mockCreateEventDb.mockResolvedValue(createdEvent as any)

      const response = await request(app)
        .post('/api/events')
        .send(validEventData)
        .expect(201)

      expect(response.body.message).toBe('Evento creado exitosamente')
      expect(response.body.event).toEqual(createdEvent)
      expect(mockCreateEventDb).toHaveBeenCalledWith(validEventData, 'user-123')
    })

    it('should return 400 for invalid event data', async () => {
      const invalidData = { title: '' } // Missing required fields

      const response = await request(app)
        .post('/api/events')
        .send(invalidData)
        .expect(400)

      expect(response.body.error).toBe('Datos inválidos')
      expect(response.body.details).toBeDefined()
    })

    it('should handle database error during event creation', async () => {
      mockCreateEventDb.mockRejectedValue(new Error('Database connection failed'))

      const response = await request(app)
        .post('/api/events')
        .send(validEventData)
        .expect(500)

      expect(response.body.error).toBe('Database connection failed')
    })

    it('should handle non-Error exceptions during event creation', async () => {
      mockCreateEventDb.mockRejectedValue('String error')

      const response = await request(app)
        .post('/api/events')
        .send(validEventData)
        .expect(500)

      expect(response.body.error).toBe('Error al crear el evento')
    })
  })

  describe('GET /api/events/manage/:id (Get Event for Editing)', () => {
    const eventId = '550e8400-e29b-41d4-a716-446655440000'
    
    it('should return event for editing', async () => {
      const eventData = { id: eventId, title: 'Test Event', organizer: 'user-123' }
      mockGetEventByIdDb.mockResolvedValue(eventData as any)

      const response = await request(app)
        .get(`/api/events/manage/${eventId}`)
        .expect(200)

      expect(response.body).toEqual(eventData)
      expect(mockGetEventByIdDb).toHaveBeenCalledWith(eventId)
    })

    it('should return 404 when event not found', async () => {
      mockGetEventByIdDb.mockResolvedValue(null)

      const response = await request(app)
        .get(`/api/events/manage/${eventId}`)
        .expect(404)

      expect(response.body.error).toBe('Evento no encontrado')
    })

    it('should handle database error when getting event', async () => {
      mockGetEventByIdDb.mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get(`/api/events/manage/${eventId}`)
        .expect(500)

      expect(response.body.error).toBe('Error al cargar el evento')
    })
  })

  describe('PUT /api/events/:id (Update Event)', () => {
    const eventId = '550e8400-e29b-41d4-a716-446655440000'
    const updateData = {
      id: eventId,
      title: 'Updated Event',
      description: 'Updated description',
      date: '2024-12-01',
      time: '20:00',
      location: 'Updated Venue',
      address: 'Updated Address',
      category: 'musica',
      price: 60000,
      currency: 'COP',
      image: 'https://example.com/updated.jpg',
      organizer: 'Test Organizer',
      capacity: 150,
      tags: ['updated'],
      status: 'active' as const,
      city: 'bogota' as const
    }

    it('should update event successfully', async () => {
      mockUpdateEventDb.mockResolvedValue(updateData as any)

      const response = await request(app)
        .put(`/api/events/${eventId}`)
        .send(updateData)
        .expect(200)

      expect(response.body.message).toBe('Evento actualizado exitosamente')
      expect(response.body.event).toEqual(updateData)
      expect(mockUpdateEventDb).toHaveBeenCalledWith(updateData, 'user-123')
    })

    it('should return 400 for invalid update data', async () => {
      const invalidData = { id: eventId, title: '' }

      const response = await request(app)
        .put(`/api/events/${eventId}`)
        .send(invalidData)
        .expect(400)

      expect(response.body.error).toBe('Datos inválidos')
    })

    it('should return 404 when event to update not found', async () => {
      mockUpdateEventDb.mockResolvedValue(null)

      const response = await request(app)
        .put(`/api/events/${eventId}`)
        .send(updateData)
        .expect(404)

      expect(response.body.error).toBe('Evento no encontrado')
    })

    it('should handle database error during update', async () => {
      mockUpdateEventDb.mockRejectedValue(new Error('Update failed'))

      const response = await request(app)
        .put(`/api/events/${eventId}`)
        .send(updateData)
        .expect(500)

      expect(response.body.error).toBe('Update failed')
    })

    it('should handle non-Error exceptions during update', async () => {
      mockUpdateEventDb.mockRejectedValue('String error')

      const response = await request(app)
        .put(`/api/events/${eventId}`)
        .send(updateData)
        .expect(500)

      expect(response.body.error).toBe('Error al actualizar el evento')
    })
  })

  describe('DELETE /api/events/:id (Delete Event)', () => {
    const eventId = '550e8400-e29b-41d4-a716-446655440000'
    
    it('should delete event successfully', async () => {
      mockDeleteEventDb.mockResolvedValue(true)

      const response = await request(app)
        .delete(`/api/events/${eventId}`)
        .expect(200)

      expect(response.body.message).toBe('Evento eliminado exitosamente')
      expect(mockDeleteEventDb).toHaveBeenCalledWith(eventId, 'user-123')
    })

    it('should return 404 when event to delete not found', async () => {
      mockDeleteEventDb.mockResolvedValue(false)

      const response = await request(app)
        .delete(`/api/events/${eventId}`)
        .expect(404)

      expect(response.body.error).toBe('Evento no encontrado')
    })

    it('should handle database error during deletion', async () => {
      mockDeleteEventDb.mockRejectedValue(new Error('Delete failed'))

      const response = await request(app)
        .delete(`/api/events/${eventId}`)
        .expect(500)

      expect(response.body.error).toBe('Error al eliminar el evento')
    })
  })

  describe('GET /api/events/manage (List Organizer Events)', () => {
    it('should list organizer events successfully', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Event 1', organizer: 'user-123' },
        { id: 'event-2', title: 'Event 2', organizer: 'user-123' }
      ]
      mockListOrganizerEventsDb.mockResolvedValue({
        events: mockEvents,
        total: 2
      } as any)

      const response = await request(app)
        .get('/api/events/manage')
        .expect(200)

      expect(response.body.events).toEqual(mockEvents)
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1
      })
      expect(mockListOrganizerEventsDb).toHaveBeenCalledWith('user-123', expect.any(Object))
    })

    it('should handle query parameters correctly', async () => {
      mockListOrganizerEventsDb.mockResolvedValue({ events: [], total: 0 } as any)

      const response = await request(app)
        .get('/api/events/manage?page=2&limit=10&city=bogota')
        .expect(200)

      expect(response.body.pagination.page).toBe(2)
      expect(response.body.pagination.limit).toBe(10)
      expect(mockListOrganizerEventsDb).toHaveBeenCalledWith('user-123', expect.objectContaining({
        page: 2,
        limit: 10,
        city: 'bogota'
      }))
    })

    it('should return 400 for invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/events/manage?page=invalid&limit=1000')
        .expect(400)

      expect(response.body.error).toBe('Parámetros inválidos')
      expect(response.body.details).toBeDefined()
    })

    it('should handle database error when listing organizer events', async () => {
      mockListOrganizerEventsDb.mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/events/manage')
        .expect(500)

      expect(response.body.error).toBe('Error al cargar los eventos')
    })
  })
})