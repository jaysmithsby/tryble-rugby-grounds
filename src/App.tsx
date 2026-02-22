import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SimulationProvider } from "@/contexts/SimulationContext";
import { SimulationBanner } from "@/components/SimulationBanner";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { errorTracking } from "@/lib/errorTracking";
import { AnimatedRoutes } from "@/components/AnimatedRoutes";

/**
 * QueryClient Configuration
 * 
 * Global cache settings optimized for mobile/desktop navigation:
 * - staleTime: How long data is considered fresh (won't refetch)
 * - gcTime: How long unused data stays in cache before garbage collection
 * 
 * These defaults ensure instant page transitions while still keeping data fresh.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default: keep data fresh for 2 minutes (prevents refetch on quick nav)
      staleTime: 2 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Don't refetch when window regains focus (reduces network noise)
      refetchOnWindowFocus: false,
      // Retry failed queries once
      retry: 1,
      // Don't refetch when remounting (preserves cache during navigation)
      refetchOnMount: false,
    },
  },
});

const App = () => {
  // Initialize error tracking on mount
  useEffect(() => {
    errorTracking.init();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <SimulationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <SimulationBanner />
                <AnimatedRoutes />
                <CookieConsentBanner />
              </BrowserRouter>
            </TooltipProvider>
          </SimulationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
