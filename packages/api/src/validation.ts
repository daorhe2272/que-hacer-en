import { z } from 'zod'
import { CATEGORIES } from '@que-hacer-en/shared'
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, DEFAULT_PAGE_NUMBER } from './constants'

export const cityEnum = z.enum(['bogota', 'medellin', 'cali', 'barranquilla', 'cartagena'])

export const listQuerySchema = z.object({
  city: cityEnum.optional(),
  category: z.enum(CATEGORIES.map((c: { slug: string }) => c.slug) as [string, ...string[]]).optional(),
  q: z.string().min(1).max(200).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE_NUMBER),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
  sort: z.enum(['date', 'price']).optional(),
  order: z.enum(['asc', 'desc']).optional()
})

export const eventSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().min(2).max(200),
  address: z.string().min(2).max(200),
  category: z.string().min(2).max(100),
  city: cityEnum,
  price: z.number().nonnegative().nullable(),
  currency: z.string().min(3).max(3),
  image: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  active: z.boolean().optional()
})

export const createEventSchema = eventSchema.omit({ id: true })

export const updateEventSchema = eventSchema.partial().extend({
  id: z.string().uuid()
})

// User validation schemas
export const userRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long')
})

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
})

export type ListQuery = z.infer<typeof listQuerySchema>
export type NewEvent = z.infer<typeof eventSchema>
export type UserRegistration = z.infer<typeof userRegistrationSchema>
export type UserLogin = z.infer<typeof userLoginSchema>


