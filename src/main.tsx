import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import App from './App'
import { ADMIN_QUERY_PREFIX } from './lib/adminCounts'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 min
      gcTime:    1000 * 60 * 10,       // 10 min
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },

  // Rule: after ANY successful mutation, refresh every admin-scoped query.
  // This is what makes the sidebar pending badges and the dashboard stats
  // update the moment an admin verifies a provider, reviews a resource,
  // answers a message, or publishes a post — without each page having to
  // remember to invalidate the counts itself.
  //
  // Admin query keys are all prefixed 'admin-' (see src/lib/adminCounts.ts).
  // invalidateQueries only refetches *mounted* queries, so provider-portal
  // and public sessions trigger no extra requests.
  mutationCache: new MutationCache({
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          String(query.queryKey[0] ?? '').startsWith(ADMIN_QUERY_PREFIX),
      })
    },
  }),
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
)
