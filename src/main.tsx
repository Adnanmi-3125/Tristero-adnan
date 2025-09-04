import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/services/queryClient'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PriceProvider } from '@/context/PriceContext'
import './index.css'
import EnhancedApp from './EnhancedApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PriceProvider>
          <EnhancedApp />
          <ReactQueryDevtools initialIsOpen={false} />
        </PriceProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
