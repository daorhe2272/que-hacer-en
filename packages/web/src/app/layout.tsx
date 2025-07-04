import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s | Qué hacer en...',
    default: 'Qué hacer en... | Descubre eventos en tu ciudad',
  },
  description: 'Descubre los mejores eventos y actividades en tu ciudad. Encuentra conciertos, festivales, obras de teatro y mucho más.',
  keywords: ['eventos', 'actividades', 'conciertos', 'festivales', 'entretenimiento'],
  authors: [{ name: 'Qué hacer en...' }],
  creator: 'Qué hacer en...',
  publisher: 'Qué hacer en...',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
} 