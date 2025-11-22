import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Order Execution Demo',
  description: 'Real-time DEX order execution with WebSocket status updates',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
