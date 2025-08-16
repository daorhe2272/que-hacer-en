export interface CategoryDefinition {
  slug: string
  label: string
}

export const CATEGORIES: CategoryDefinition[] = [
  { slug: 'todos', label: 'Todos' },
  { slug: 'musica', label: 'Música' },
  { slug: 'arte', label: 'Arte' },
  { slug: 'gastronomia', label: 'Gastronomía' },
  { slug: 'deportes', label: 'Deportes' },
  { slug: 'tecnologia', label: 'Tecnología' },
  { slug: 'networking', label: 'Networking' }
]

export function normalizeCategorySlug(input: string): string {
  const normalized = input.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$|_/g, '')
  const match = CATEGORIES.find(c => c.slug === normalized)
  return match ? match.slug : normalized
}

export function categoryLabelFromSlug(slug: string): string {
  const found = CATEGORIES.find(c => c.slug === slug)
  return found ? found.label : slug
}


