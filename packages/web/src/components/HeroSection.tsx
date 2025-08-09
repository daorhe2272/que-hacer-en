'use client'

import SearchComponent from '@/components/SearchComponent'

interface HeroSectionProps {
  cityName?: string
  cityId?: string
}

export default function HeroSection({ cityName, cityId }: HeroSectionProps) {
  return (
    <section 
      className="min-h-[70vh] flex items-center px-4 sm:px-6 lg:px-8 relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/hero-background.jpeg')"
      }}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-hero-gradient opacity-80"></div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto w-full relative z-10">
        {/* Hero Title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight animate-slideIn max-w-4xl">
          Descubre qué hacer en{' '}
          <span className="text-accent-400">
            {cityName ? cityName : 'tu ciudad'}
          </span>
        </h1>
        
        {/* Hero Subtitle */}
        <p className="text-xl sm:text-2xl text-white/90 mb-12 max-w-2xl animate-fadeIn">
          Los mejores eventos, conciertos, talleres y experiencias en Colombia
        </p>

        {/* Search Component */}
        <div className="max-w-3xl">
          <SearchComponent cityId={cityId} />
        </div>
      </div>
    </section>
  )
} 