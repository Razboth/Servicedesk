import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers/session-provider'
import { SidebarProvider } from '@/components/providers/sidebar-provider'
import { SocketProvider } from '@/components/providers/socket-provider'
import { SidebarLayout } from '@/components/navigation/sidebar-layout'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from 'sonner'
import IdleTimer from '@/components/auth/idle-timer'
import { TicketNotifications } from '@/components/notifications/ticket-notifications'
import { BrowserCompatibilityWarning } from '@/components/browser-compatibility-warning'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bank SulutGo ServiceDesk',
  description: 'IT Service Management Portal for Bank SulutGo',
  keywords: ['servicedesk', 'ITSM', 'Bank SulutGo', 'IT support'],
  authors: [{ name: 'Bank SulutGo IT Team' }],
  robots: 'noindex, nofollow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <SocketProvider>
              <BrowserCompatibilityWarning />
              <SidebarProvider>
                <SidebarLayout>
                  {children}
                </SidebarLayout>
              </SidebarProvider>
              <IdleTimer />
              <TicketNotifications />
              <Toaster position="top-right" richColors />
            </SocketProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}