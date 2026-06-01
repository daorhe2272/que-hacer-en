'use client'

import { useState } from 'react'
import Toast from './Toast'

interface ShareButtonProps {
  title: string
  url: string
  size?: 'sm' | 'md'
}

export default function ShareButton({ title, url, size = 'sm' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (navigator.share && navigator.canShare({ title, url })) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable — nothing more we can do
    }
  }

  const iconSize = size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  const padding = size === 'md' ? 'p-3' : 'p-2'

  return (
    <>
      <button
        onClick={handleShare}
        className={`${padding} rounded-full bg-white/80 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/90 text-gray-600`}
        aria-label="Compartir evento"
      >
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 8l4 4-4 4M18 12H8a4 4 0 000 8"
          />
        </svg>
      </button>
      <Toast message="¡Link copiado!" visible={copied} />
    </>
  )
}