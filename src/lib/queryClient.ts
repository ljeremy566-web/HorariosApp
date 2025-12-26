import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes - data is considered fresh
            gcTime: 1000 * 60 * 30,   // 30 minutes - keep in cache (formerly cacheTime)
            retry: 2,                  // Retry failed requests twice
            refetchOnWindowFocus: false, // Don't refetch when tab regains focus
        },
        mutations: {
            retry: 1, // Retry failed mutations once
        },
    },
});
