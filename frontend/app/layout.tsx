import type { Metadata } from 'next'
import { ReactNode } from 'react'
import './globals.css'
import { WorkspaceProvider } from '@/lib/workspace-context'

export const metadata: Metadata = {
    title: 'Claude Finance Agent',
    description: 'Chat with the Claude Finance agent and inspect tool outputs in real time.'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="main-container">
        <WorkspaceProvider>
          {children}
        </WorkspaceProvider>
      </body>
    </html>
  )
}
