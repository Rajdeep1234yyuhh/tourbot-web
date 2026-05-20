import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Assamese Tourism Chatbot',
  description: 'Assamese-English code-mixed tourism chatbot — M.Tech Thesis, Gauhati University',
  keywords: ['Assamese', 'chatbot', 'tourism', 'NLP', 'code-mixed', 'MuRIL'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
