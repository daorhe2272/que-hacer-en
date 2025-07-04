export interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  address: string
  category: string
  price: number
  currency: string
  image: string
  organizer: string
  capacity: number
  tags: string[]
  status: 'active' | 'cancelled' | 'postponed' | 'sold_out'
}

export interface EventsData {
  bogota: Event[]
  medellin: Event[]
  cali: Event[]
  barranquilla: Event[]
}

export type CityKey = keyof EventsData 