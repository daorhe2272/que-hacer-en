'use client'

import { useEffect } from 'react'

export default function ScrollToHash() {
  useEffect(() => {
    // Check if there's a hash in the URL
    const hash = window.location.hash
    if (hash) {
      // Wait for the page to be fully rendered before scrolling
      const timer = setTimeout(() => {
        const element = document.getElementById(hash.substring(1))
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          })
        }
      }, 100) // Small delay to ensure page is rendered

      return () => clearTimeout(timer)
    }
  }, [])

  return null // This component doesn't render anything
}