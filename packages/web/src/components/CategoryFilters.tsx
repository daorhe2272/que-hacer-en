'use client'

import { useState } from 'react'
import { CATEGORIES } from '@que-hacer-en/shared'

function IconTodos() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconArte() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {/* Palette body — rounded kidney shape with thumb notch */}
      <path d="M12 3C7 3 3 7 3 12c0 2.5 1 4.8 2.7 6.4C7 19.7 8.7 20.5 11 20.5h1c1.1 0 2-.9 2-2 0-.6.4-1 1-1h1c2.8 0 5-2.2 5-5C21 7.5 16.5 3 12 3z" />
      {/* Paint dots */}
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7.5" r="1" />
      <circle cx="14" cy="7" r="1" />
      {/* Paintbrush handle */}
      <line x1="21" y1="3" x2="13.5" y2="10.5" />
      {/* Brush tip */}
      <path d="M13.5 10.5 c-1 1-1.5 2.5-1 3.5 1-.5 2.5-1 3.5-1z" />
    </svg>
  )
}

function IconCine() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M16 10l6-3v10l-6-3V10z" />
    </svg>
  )
}

function IconDanza() {
  return (
    <svg width="24" height="24" viewBox="0 0 31.925 31.925" fill="currentColor" stroke="none">
      <path d="M19.469,22.809c0.093-0.625,0.605-2.154,0.904-3.158c-0.105,0.002-0.212-0.007-0.315-0.036c-0.222-0.059-0.415-0.181-0.56-0.348c-0.224,0.035-0.449,0.003-0.652-0.092c-0.208-0.096-0.375-0.25-0.489-0.44c-0.225-0.004-0.439-0.073-0.625-0.204c-0.078-0.054-0.143-0.121-0.202-0.19c0.074,1.172,0.124,2.227,0.14,2.548c0.041,0.797-0.435,2.653-0.271,3.424c0.165,0.772,1.378,2.911,1.419,3.272c0.041,0.36-0.338,0.518-0.531,0.719c-0.194,0.202-0.132,0.509,0.023,0.689c0.156,0.181,0.583,0.345,0.739,0.689s-0.082,1.677-0.1,2.021c-0.017,0.343,0.436,0.246,0.592,0c0.155-0.246,0.846-1.396,0.887-2.095c0.041-0.697-0.275-1.633-0.345-2.045C20.013,27.151,19.371,23.474,19.469,22.809z"/>
      <path d="M14.822,10.664c-0.512-0.146-1.021-0.292-1.463-0.418c-1.634-0.465-7.724-1.664-8.277-1.774S4.185,8.134,3.973,8.015S2.29,6.229,1.632,6.18C0.976,6.131,0.681,6.722,0.943,7.042C1.205,7.362,2.584,8.692,3.16,8.89c0.575,0.197,0.972,0.322,1.577,0.517c0.433,0.141,6.415,2.373,9.891,3.797c-0.005-0.027-0.017-0.052-0.02-0.079c-0.021-0.23,0.029-0.453,0.137-0.646c-0.106-0.191-0.156-0.414-0.137-0.642c0.021-0.23,0.108-0.441,0.248-0.613C14.794,11.045,14.789,10.853,14.822,10.664z"/>
      <path d="M30.9,0.021c-0.319-0.147-2.353,0.518-2.784,1.01c-0.431,0.493-3.024,5.934-3.424,6.701c0.025-0.185-0.505-0.775-0.342-1.081c0.163-0.305,0.958-0.803,1.007-1c0.049-0.196-0.542-0.665-0.468-0.801c0.074-0.135,0.209-0.258,0.123-0.369c-0.086-0.11-0.689-0.099-0.862-0.222c-0.172-0.123-0.558-0.44-0.812-0.64c-0.254-0.2-1.527-0.025-2.021,0.394s-0.656,1.057-0.714,1.232c-0.057,0.175-0.283,0.185-0.32,0.394c-0.036,0.209,0.53,0.887,0.715,0.961s1.024,0.575,1.22,0.689s-0.012,0.259-0.16,0.172c-0.148-0.086-7.454-4.776-7.957-5.1c-0.504-0.322-3.24-0.185-3.598,0c-0.356,0.186,1.158,1.108,1.527,1.011c0.37-0.1,1.22-0.505,1.479-0.346c0.259,0.16,6.898,5.531,7.145,5.913c0.247,0.382,0.428,1.89,0.223,2.217c-0.051,0.081-0.138,0.125-0.243,0.149c-1.338-1.168-3.224-2.807-3.411-2.937c-0.288-0.204-0.69-0.133-0.894,0.155c-0.146,0.208-0.146,0.47-0.031,0.677c-0.235,0.005-0.463,0.136-0.568,0.363c-0.107,0.229-0.062,0.487,0.087,0.672c-0.233,0.045-0.434,0.215-0.498,0.458c-0.065,0.245,0.023,0.489,0.201,0.646c-0.221,0.086-0.389,0.287-0.411,0.538c-0.021,0.251,0.108,0.478,0.312,0.601c-0.203,0.123-0.333,0.351-0.312,0.601c0.022,0.252,0.19,0.451,0.411,0.538c-0.179,0.156-0.268,0.401-0.202,0.645c0.064,0.246,0.265,0.413,0.499,0.459c-0.149,0.185-0.194,0.443-0.087,0.669c0.106,0.23,0.333,0.361,0.568,0.367c-0.114,0.208-0.111,0.469,0.031,0.675c0.146,0.206,0.389,0.296,0.623,0.26c-0.075,0.225-0.029,0.48,0.149,0.658c0.178,0.179,0.435,0.224,0.658,0.148c-0.035,0.232,0.055,0.479,0.262,0.624c0.208,0.145,0.467,0.145,0.675,0.032c0.006,0.235,0.138,0.463,0.365,0.568c0.229,0.107,0.486,0.062,0.671-0.086c0.046,0.232,0.213,0.432,0.459,0.497c0.243,0.066,0.488-0.023,0.644-0.202c0.086,0.222,0.287,0.389,0.54,0.41c0.251,0.021,0.477-0.108,0.6-0.311c0.123,0.203,0.349,0.332,0.602,0.311c0.251-0.022,0.45-0.189,0.535-0.41c0.158,0.179,0.402,0.268,0.647,0.202c0.244-0.066,0.41-0.266,0.457-0.497c0.185,0.147,0.442,0.192,0.673,0.086c0.227-0.106,0.358-0.333,0.363-0.57c0.208,0.114,0.468,0.114,0.676-0.031c0.289-0.203,0.36-0.604,0.158-0.895c-0.136-0.191-1.895-2.211-3.066-3.554c1.325-1.071,2.713-2.154,2.835-2.467c0.238-0.608-0.113-1.527-0.147-1.995c-0.035-0.468,3.019-7.371,3.178-7.76c0.16-0.391,1.231,0.062,1.725-0.173C31.097,1.043,31.22,0.169,30.9,0.021z"/>
    </svg>
  )
}

function IconDeportes() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {/* Ball outline */}
      <circle cx="12" cy="12" r="9" />
      {/* Central pentagon */}
      <polygon points="12,7.5 15.5,10 14.2,14 9.8,14 8.5,10" />
      {/* Seam lines from each pentagon vertex to the ball edge */}
      <line x1="12" y1="7.5" x2="12" y2="3" />
      <line x1="15.5" y1="10" x2="19.5" y2="8.5" />
      <line x1="14.2" y1="14" x2="17" y2="17.5" />
      <line x1="9.8" y1="14" x2="7" y2="17.5" />
      <line x1="8.5" y1="10" x2="4.5" y2="8.5" />
    </svg>
  )
}

function IconGastronomia() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M8 6V4M12 6V4M16 6V4" />
      <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    </svg>
  )
}

function IconMusica() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V6l12-2v12" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function IconNegocios() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="2" y1="14" x2="22" y2="14" />
    </svg>
  )
}

function IconNetworking() {
  return (
    <svg width="24" height="24" viewBox="63 18 133 133" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
      {/* Top person */}
      <circle cx="132.55" cy="50.95" r="7" />
      <circle cx="132.55" cy="57.5" r="23" />
      <path d="m132.55,80.5c5.45,0,10.45-1.91,14.39-5.08-1.82-6.24-7.57-10.8-14.39-10.8s-12.57,4.56-14.39,10.8c3.94,3.17,8.94,5.08,14.39,5.08Z" />
      {/* Bottom-left person */}
      <circle cx="95.05" cy="110.77" r="7" />
      <circle cx="95.05" cy="117.32" r="23" />
      <path d="m95.05,140.32c5.45,0,10.45-1.91,14.39-5.08-1.82-6.24-7.57-10.8-14.39-10.8s-12.57,4.56-14.39,10.8c3.94,3.17,8.94,5.08,14.39,5.08Z" />
      {/* Bottom-right person */}
      <circle cx="169.95" cy="110.77" r="7" />
      <circle cx="169.95" cy="117.32" r="23" />
      <path d="m169.95,140.32c5.45,0,10.45-1.91,14.39-5.08-1.82-6.24-7.57-10.8-14.39-10.8s-12.57,4.56-14.39,10.8c3.94,3.17,8.94,5.08,14.39,5.08Z" />
      {/* Connecting lines */}
      <line x1="132.55" y1="98.95" x2="132.55" y2="80.47" />
      <line x1="132.55" y1="98.95" x2="116.25" y2="108.36" />
      <line x1="132.55" y1="98.95" x2="148.78" y2="108.31" />
    </svg>
  )
}

function IconTeatro() {
  return (
    <svg width="24" height="24" viewBox="0 0 473.194 473.194" fill="currentColor" stroke="none">
      <path d="M464.653,167.757c-0.824-3.273-2.996-6.037-5.969-7.633c-2.965-1.586-6.47-1.855-9.65-0.738
        c-27.88,9.795-70.896,16.098-119.276,16.098c-11.762,0-23.098-0.449-34.089-1.156c-5.683,25.676-14.764,49.252-26.363,70.016
        c0.564-0.023,1.103-0.115,1.672-0.115c15.034,0,27.218-1.254,27.218,8.873c0,10.127-12.185,27.803-27.218,27.803
        c-8.757,0-16.467-2.834-21.442-7.162c-15.025,18.654-32.578,33.363-51.909,43.09c21.795,73.361,72.751,124.824,132.131,124.824
        c79.219,0,143.437-91.584,143.437-204.559C473.194,212.728,470.151,189.408,464.653,167.757z M386.92,381.927
        c-0.254,1.078-1.056,1.957-2.11,2.303c-1.056,0.353-2.218,0.131-3.066-0.586c-11.174-9.389-30.182-15.627-51.985-15.627
        c-21.805,0-40.813,6.238-51.986,15.627c-0.849,0.709-2.012,0.932-3.066,0.586c-1.055-0.354-1.856-1.225-2.11-2.303
        c-0.925-3.936-1.494-7.994-1.494-12.215c0-32.395,26.263-58.656,58.657-58.656c32.394,0,58.655,26.262,58.655,58.656
        C388.413,373.933,387.844,377.992,386.92,381.927z M388.537,280.904c-15.034,0-27.218-17.676-27.218-27.803
        c0-10.127,12.185-8.873,27.218-8.873c15.033,0,27.218,8.211,27.218,18.338C415.754,272.693,403.57,280.904,388.537,280.904z"/>
      <path d="M286.874,109.925c0-24.367-3.043-47.688-8.541-69.338c-0.824-3.273-2.996-6.039-5.969-7.633
        c-1.756-0.939-3.705-1.416-5.669-1.416c-1.341,0-2.688,0.221-3.981,0.678c-27.88,9.795-70.895,16.096-119.276,16.096
        c-48.382,0-91.397-6.301-119.277-16.096c-1.286-0.457-2.626-0.678-3.966-0.678c-1.963,0-3.921,0.482-5.685,1.424
        c-2.965,1.594-5.144,4.359-5.969,7.625C3.043,62.238,0,85.558,0,109.925c0,112.977,64.217,204.559,143.438,204.559
        C222.657,314.484,286.874,222.902,286.874,109.925z M57.439,135.349c0-10.129,12.185-18.338,27.219-18.338
        c15.033,0,27.218,17.674,27.218,27.803c0,10.127-12.185,8.873-27.218,8.873C69.624,153.687,57.439,145.476,57.439,135.349z
         M143.438,275.812c-32.395,0-58.656-26.262-58.656-58.654c0-4.221,0.569-8.281,1.493-12.217c0.254-1.076,1.056-1.947,2.11-2.303
        c1.056-0.346,2.218-0.123,3.066,0.586c11.174,9.389,30.182,15.627,51.986,15.627c21.804,0,40.812-6.238,51.985-15.627
        c0.849-0.717,2.011-0.939,3.066-0.586c1.055,0.348,1.856,1.227,2.11,2.303c0.924,3.936,1.494,7.996,1.494,12.217
        C202.093,249.55,175.831,275.812,143.438,275.812z M174.998,144.814c0-10.129,12.185-27.803,27.219-27.803
        c15.033,0,27.218,8.209,27.218,18.338c0,10.127-12.185,18.338-27.218,18.338C187.183,153.687,174.998,154.941,174.998,144.814z"/>
    </svg>
  )
}

function IconTecnologia() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <path d="M8 20h8M12 18v2" />
      <path d="M8 9l3 3-3 3M13 15h3" />
    </svg>
  )
}

const CATEGORY_ICON_MAP: Record<string, () => JSX.Element> = {
  todos:       IconTodos,
  arte:        IconArte,
  cine:        IconCine,
  danza:       IconDanza,
  deportes:    IconDeportes,
  gastronomia: IconGastronomia,
  musica:      IconMusica,
  negocios:    IconNegocios,
  networking:  IconNetworking,
  teatro:      IconTeatro,
  tecnologia:  IconTecnologia,
}

const categories = CATEGORIES.map(c => ({ key: c.slug, label: c.label }))

interface CategoryFiltersProps {
  selectedCategory?: string
  onCategoryChange?: (category: string) => void
}

export default function CategoryFilters({
  selectedCategory = 'todos',
  onCategoryChange,
}: CategoryFiltersProps) {
  const [activeCategory, setActiveCategory] = useState(selectedCategory)

  function handleCategoryClick(categoryKey: string) {
    setActiveCategory(categoryKey)
    onCategoryChange?.(categoryKey)
  }

  return (
    <div className="flex items-center gap-3 py-3 pb-6 overflow-x-auto scrollbar-hide">
      {categories.map((category) => {
        const isActive = activeCategory === category.key
        const Icon = CATEGORY_ICON_MAP[category.key]
        return (
          <button
            key={category.key}
            onClick={() => handleCategoryClick(category.key)}
            className={`
              flex flex-col items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-300 ease-in-out min-w-[72px]
              ${isActive
                ? 'bg-primary-100 text-primary-600 border border-primary-600 shadow-sm'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-primary-300 hover:text-primary-600 shadow-sm'
              }
            `}
          >
            {Icon && <Icon />}
            <span>{category.label}</span>
          </button>
        )
      })}
    </div>
  )
}