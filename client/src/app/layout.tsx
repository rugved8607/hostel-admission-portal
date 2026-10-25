import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { MockDataProvider } from '@/context/MockDataContext' 

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VJTI Hostel Portal',
  description: 'Hostel Admission and Room Allocation Portal — VJTI Mumbai',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        <MockDataProvider>
          {children}
        </MockDataProvider>
      </body>
    </html>
  )
}