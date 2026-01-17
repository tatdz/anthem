// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Anthem - Dynamic Risk Tranching',
  description: 'Auto-tranching DeFi protocol with Sovereign Pool integration and ADL-adjusted LTV',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-text antialiased`}>
        {children}
      </body>
    </html>
  )
}