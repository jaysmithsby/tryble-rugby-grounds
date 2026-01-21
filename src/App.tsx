import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SimulationProvider } from "@/contexts/SimulationContext";
import { SimulationBanner } from "@/components/SimulationBanner";
import Index from "./pages/Index";
import About from "./pages/About";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Badges from "./pages/Badges";
import Leaderboard from "./pages/Leaderboard";
import PoolLeaderboard from "./pages/PoolLeaderboard";
import SchoolProfile from "./pages/SchoolProfile";
import Tournament from "./pages/Tournament";
import Admin from "./pages/Admin";
import ResetPassword from "./pages/ResetPassword";
import JoinPool from "./pages/JoinPool";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
              <Route path="/about" element={<About />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/home" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/badges" element={<Badges />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/pool/:poolId" element={<PoolLeaderboard />} />
              <Route path="/school/:schoolSlug" element={<SchoolProfile />} />
              <Route path="/tournament/:tournamentId" element={<Tournament />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/join-pool/:inviteCode" element={<JoinPool />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SimulationProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
