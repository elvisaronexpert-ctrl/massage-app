import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Agendamento de Massagem · RH',
  description: 'Sistema de agendamento de massagem — Carrilho Bem-Estar',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen bg-stone-50`}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
