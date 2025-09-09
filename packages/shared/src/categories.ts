export interface CategoryDefinition {
  slug: string
  label: string
}

export const CATEGORIES: CategoryDefinition[] = [
  { slug: 'todos', label: 'Todos' },
  { slug: 'arte', label: 'Arte' },
  { slug: 'cine', label: 'Cine' },
  { slug: 'danza', label: 'Danza' },
  { slug: 'deportes', label: 'Deportes' },
  { slug: 'gastronomia', label: 'Gastronomía' },
  { slug: 'musica', label: 'Música' },
  { slug: 'negocios', label: 'Negocios' },
  { slug: 'networking', label: 'Networking' },
  { slug: 'teatro', label: 'Teatro' },
  { slug: 'tecnologia', label: 'Tecnología' }
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


