export interface Event {
  id: string
  title: string
  description: string
  utcTimestamp: string
  location: string
  address: string
  category: string
  city: string
  price: number | null
  currency: string
  image: string
  organizer: string
  tags: string[]
  status: 'active' | 'cancelled' | 'postponed' | 'sold_out'
  created_by?: string
  event_url?: string
  active?: boolean
}

export interface EventsData {
  bogota: Event[]
  medellin: Event[]
  cali: Event[]
  barranquilla: Event[]
  cartagena: Event[]
}

export type CityKey = keyof EventsData

