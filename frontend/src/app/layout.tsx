import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PrescriberPoint - AI-Enhanced Drug Information',
  description: 'Professional drug information platform with AI-enhanced content for healthcare providers',
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