import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Assamese Tourism Chatbot',
  description: 'AI-powered tourism assistant for Assam — ask in Assamese, English, or code-mixed queries.',
  keywords: ['Assamese', 'chatbot', 'tourism', 'NLP', 'code-mixed', 'MuRIL'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
