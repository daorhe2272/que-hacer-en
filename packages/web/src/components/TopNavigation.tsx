'use client'

import { MapPin, ChevronDown } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/session'
import { LoginLink } from './LoginLink'
import Image from 'next/image'

const cities = [
  { id: 'bogota', name: 'Bogotá' },
  { id: 'medellin', name: 'Medellín' },
  { id: 'cali', name: 'Cali' },
  { id: 'barranquilla', name: 'Barranquilla' },
  { id: 'cartagena', name: 'Cartagena' }
]

export default function TopNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [desktopSearchTerm, setDesktopSearchTerm] = useState('')
  const [mobileSearchTerm, setMobileSearchTerm] = useState('')
  const { isAuthenticated, user, signOut } = useSession()

  useEffect(() => {
    // Keep to ensure module is client side initialized for auth events
    try {
      const supabase = getSupabaseBrowserClient()
      supabase.auth.getSession()
    } catch {}
  }, [])

  function handleCitySelect(cityId: string) {
    setIsDropdownOpen(false)
    router.push(`/eventos/${cityId}#events`)
  }

  function handleSearch(searchTerm: string, isMobile = false) {
    const trimmedTerm = searchTerm.trim()
    if (!trimmedTerm) return

    // Extract city from current path
    const cityMatch = pathname.match(/\/eventos\/([^/?]+)/)
    const currentCity = cityMatch ? cityMatch[1] : null

    if (currentCity && cities.find(c => c.id === currentCity)) {
      // If we're on a city page, search within that city
      router.push(`/eventos/${currentCity}?q=${encodeURIComponent(trimmedTerm)}#events`)
    } else {
      // If we're on home or other pages, search across all cities (no city filter)
      // This will create a general search page showing results from all cities
      router.push(`/?q=${encodeURIComponent(trimmedTerm)}#events`)
    }

    // Close mobile search if it was opened
    if (isMobile) {
      setIsMobileSearchOpen(false)
      setMobileSearchTerm('')
    } else {
      setDesktopSearchTerm('')
    }
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-[100] w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="/" className="flex items-center">
              <Image src="/logo-wide.png" alt="¿Qué hacer en...?" width={192} height={48} className="h-12 w-auto" priority />
            </a>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-4">
            {/* Search - Icon on mobile, Search bar on medium+ screens */}
            <div className="flex items-center">
              {/* Mobile search icon */}
              <button 
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              
              {/* Desktop search bar */}
              <div className="hidden md:flex items-center bg-gray-100 border-2 border-gray-300 rounded-lg shadow-md px-3 py-2 w-80 lg:w-96 xl:w-[28rem] hover:border-gray-400 hover:shadow-lg focus-within:border-primary-600 focus-within:shadow-lg transition-all duration-200">
                <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar eventos..."
                  value={desktopSearchTerm}
                  onChange={(e) => setDesktopSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(desktopSearchTerm)}
                  className="bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm flex-1"
                />
              </div>
            </div>
            
            {/* City Selector - Hidden on narrow screens */}
            <div className="hidden md:block relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-gray-900 rounded-lg transition-colors duration-200"
              >
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">Seleccionar ciudad</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    {cities.map((city) => (
                      <button
                        key={city.id}
                        onClick={() => handleCitySelect(city.id)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                      >
                        {city.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Create Event Button / Login */}
            {isAuthenticated ? (
              <>
                {/* Desktop view */}
                <div className="hidden md:flex items-center gap-3">
                  <button 
                    onClick={() => router.push('/crear-evento')}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    Crear Evento
                  </button>
                  <div className="relative group">
                    <button data-testid="user-menu-desktop" className="px-3 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg transition-all duration-200 bg-white hover:bg-gray-50 min-w-[100px]">
                      Cuenta
                    </button>
                    <div className="hidden group-hover:block absolute right-0 pt-1 w-44 z-50">
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg">
                        <button
                          onClick={() => router.push('/favoritos')}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        >
                          Mis Favoritos
                        </button>
                        <button
                          onClick={() => router.push('/mis-eventos')}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        >
                          Mis Eventos
                        </button>
                        <button onClick={() => signOut()} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900">Cerrar sesión</button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mobile view */}
                <div className="md:hidden relative">
                  <button
                    data-testid="user-menu-mobile"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-medium"
                  >
                    {user?.email?.[0]?.toUpperCase() ?? 'U'}
                  </button>
                  
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="py-2">
                        <button 
                          onClick={() => {
                            router.push('/crear-evento')
                            setIsUserMenuOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        >
                          Crear Evento
                        </button>
                        <button
                          onClick={() => {
                            router.push('/favoritos')
                            setIsUserMenuOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        >
                          Mis Favoritos
                        </button>
                        <button
                          onClick={() => {
                            router.push('/mis-eventos')
                            setIsUserMenuOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        >
                          Mis Eventos
                        </button>
                        <button 
                          onClick={() => {
                            setIsUserMenuOpen(false)
                            signOut()
                          }} 
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        >
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <LoginLink className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 md:px-6 rounded-lg text-sm font-medium transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                Iniciar sesión
              </LoginLink>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar - Second Row */}
      {isMobileSearchOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center bg-gray-100 border-2 border-gray-300 rounded-lg shadow-md px-3 py-2 hover:border-gray-400 hover:shadow-lg focus-within:border-primary-600 focus-within:shadow-lg transition-all duration-200">
            <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar eventos, artistas, lugares..."
              value={mobileSearchTerm}
              onChange={(e) => setMobileSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(mobileSearchTerm, true)}
              className="bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm flex-1"
              autoFocus
            />
            <button 
              className="ml-2 p-1 text-gray-500 hover:text-gray-700"
              onClick={() => setIsMobileSearchOpen(false)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdowns when clicking outside */}
      {(isDropdownOpen || isUserMenuOpen) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsDropdownOpen(false)
            setIsUserMenuOpen(false)
          }}
        />
      )}
    </nav>
  )
} 