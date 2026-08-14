import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { get, set, del } from 'idb-keyval'
import './index.css'
import { App } from './App.tsx'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from '@/hooks/useTheme'
import { initPwaInstallCapture } from '@/lib/pwa'

initPwaInstallCapture()

const DOMAIN_QUERY_ROOTS = new Set([
  'profile',
  'streaks',
  'streak-entries',
  'todos',
  'todo_topics',
  'timesheet-entries',
  'timesheet-workspaces',
])

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
      gcTime: 1000 * 60 * 60 * 24,
    },
    mutations: {
      networkMode: 'always',
    },
  },
})

const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => (await get(key)) ?? null,
    setItem: async (key, value) => {
      await set(key, value)
    },
    removeItem: async (key) => {
      await del(key)
    },
  },
  key: 'mashed-react-query',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const root = query.queryKey[0]
            return typeof root === 'string' && DOMAIN_QUERY_ROOTS.has(root)
          },
        },
      }}
    >
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
