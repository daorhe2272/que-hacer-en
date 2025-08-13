'use client'

import { useRouter } from 'next/navigation'
import ErrorBanner from './ErrorBanner'

export default function ErrorBannerClient({ message }: { message: string }) {
  const router = useRouter()
  return (
    <ErrorBanner
      message={message}
      onRetry={() => {
        router.refresh()
      }}
    />
  )
}
