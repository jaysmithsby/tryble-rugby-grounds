import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SimulationProvider } from "@/contexts/SimulationContext";
import { SimulationBanner } from "@/components/SimulationBanner";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { errorTracking } from "@/lib/errorTracking";
import ForSchools from "./pages/ForSchools";
import ForParents from "./pages/ForParents";
import ForPlayers from "./pages/ForPlayers";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PrivacyNote from "./pages/PrivacyNote";
import Terms from "./pages/Terms";
import Index from "./pages/Index";
import About from "./pages/About";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Fixtures from "./pages/Fixtures";
import Profile from "./pages/Profile";
import Badges from "./pages/Badges";
import Leaderboard from "./pages/Leaderboard";
import PoolLeaderboard from "./pages/PoolLeaderboard";
import SchoolProfile from "./pages/SchoolProfile";
import Tournament from "./pages/Tournament";
import Admin from "./pages/Admin";
import ResetPassword from "./pages/ResetPassword";
import JoinPool from "./pages/JoinPool";
import ParentConsent from "./pages/ParentConsent";
import Pools from "./pages/Pools";
import NotFound from "./pages/NotFound";
import HowScoringWorks from "./pages/HowScoringWorks";
import LearnMore from "./pages/LearnMore";

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
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/for-schools" element={<ForSchools />} />
                  <Route path="/for-parents" element={<ForParents />} />
                  <Route path="/for-players" element={<ForPlayers />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/privacy-note" element={<PrivacyNote />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/fixtures" element={<Fixtures />} />
                  <Route path="/profile" element={<Profile />} />
                  {/* Badges hidden for MVP - will be re-enabled in v2 */}
                  {/* <Route path="/badges" element={<Badges />} /> */}
                  <Route path="/pools" element={<Pools />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/pool/:poolId" element={<PoolLeaderboard />} />
                  <Route path="/school/:schoolSlug" element={<SchoolProfile />} />
                  <Route path="/tournament/:tournamentId" element={<Tournament />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/join-pool/:inviteCode" element={<JoinPool />} />
                  <Route path="/consent/:token" element={<ParentConsent />} />
                  <Route path="/how-scoring-works" element={<HowScoringWorks />} />
                  <Route path="/learn-more" element={<LearnMore />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
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
