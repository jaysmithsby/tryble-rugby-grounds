import { Routes, Route, useLocation, matchPath } from "react-router-dom";
import { motion } from "framer-motion";
import { lazy, Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

// Eagerly loaded — core nav pages
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Home from "@/pages/Home";
import Fixtures from "@/pages/Fixtures";
import Pools from "@/pages/Pools";
import Profile from "@/pages/Profile";
import Leaderboard from "@/pages/Leaderboard";
import Schools from "@/pages/Schools";
import Logs from "@/pages/Logs";

// Lazy loaded — secondary pages
const PoolLeaderboard = lazy(() => import("@/pages/PoolLeaderboard").then(m => ({ default: m.PoolLeaderboard })));
const SchoolProfile = lazy(() => import("@/pages/SchoolProfile"));
const Tournament = lazy(() => import("@/pages/Tournament"));
const Admin = lazy(() => import("@/pages/Admin"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const JoinPool = lazy(() => import("@/pages/JoinPool"));
const ParentConsent = lazy(() => import("@/pages/ParentConsent"));
const HowScoringWorks = lazy(() => import("@/pages/HowScoringWorks"));
const LearnMore = lazy(() => import("@/pages/LearnMore"));
const SchoolSetup = lazy(() => import("@/pages/SchoolSetup"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Badges = lazy(() => import("@/pages/Badges"));
const ForSchools = lazy(() => import("@/pages/ForSchools"));
const ForParents = lazy(() => import("@/pages/ForParents"));
const ForPlayers = lazy(() => import("@/pages/ForPlayers"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const PrivacyNote = lazy(() => import("@/pages/PrivacyNote"));
const Terms = lazy(() => import("@/pages/Terms"));
const About = lazy(() => import("@/pages/About"));
const LeaderboardDetail = lazy(() => import("@/pages/LeaderboardDetail"));

const PageFallback = () => (
  <div className="min-h-screen bg-background p-4 space-y-4">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full rounded-lg" />
    <Skeleton className="h-40 w-full rounded-lg" />
  </div>
);

/**
 * Pages that should be kept alive (cached) once visited.
 * These stay mounted but hidden, so scroll position and component state are preserved.
 */
const KEEP_ALIVE_ROUTES: { path: string; element: React.ReactNode }[] = [
  { path: "/", element: <Index /> },
  { path: "/home", element: <Home /> },
  { path: "/fixtures", element: <Fixtures /> },
  { path: "/pools", element: <Pools /> },
  { path: "/logs", element: <Logs /> },
  { path: "/schools", element: <Schools /> },
  { path: "/leaderboard", element: <Leaderboard /> },
];

const KEEP_ALIVE_PATHS = KEEP_ALIVE_ROUTES.map(r => r.path);

function KeepAlivePage({ path, element, isActive }: { path: string; element: React.ReactNode; isActive: boolean }) {
  return (
    <div
      style={{
        display: isActive ? "block" : "none",
        // Keep layout in DOM but hidden to preserve state & scroll
      }}
    >
      {element}
    </div>
  );
}

export const AnimatedRoutes = () => {
  useSwipeNavigation();
  const location = useLocation();
  const [visitedPaths, setVisitedPaths] = useState<Set<string>>(new Set());

  const currentPath = location.pathname;
  const isKeepAlivePage = KEEP_ALIVE_PATHS.includes(currentPath);

  // Track which keep-alive pages have been visited
  useEffect(() => {
    if (isKeepAlivePage && !visitedPaths.has(currentPath)) {
      setVisitedPaths(prev => new Set(prev).add(currentPath));
    }
  }, [currentPath, isKeepAlivePage, visitedPaths]);

  // Render visited keep-alive pages (always mounted, shown/hidden via display)
  const keepAlivePages = useMemo(() => {
    return KEEP_ALIVE_ROUTES.filter(r => visitedPaths.has(r.path) || r.path === currentPath);
  }, [visitedPaths, currentPath]);

  return (
    <>
      {/* Keep-alive pages: stay mounted, toggle visibility */}
      {keepAlivePages.map(route => (
        <KeepAlivePage
          key={route.path}
          path={route.path}
          element={route.element}
          isActive={currentPath === route.path}
        />
      ))}

      {/* Non-keep-alive pages: normal animated mount/unmount */}
      {!isKeepAlivePage && (
        <motion.div
          key={currentPath}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <Suspense fallback={<PageFallback />}>
            <Routes location={location}>
              <Route path="/for-schools" element={<ForSchools />} />
              <Route path="/for-parents" element={<ForParents />} />
              <Route path="/for-players" element={<ForPlayers />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/privacy-note" element={<PrivacyNote />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/about" element={<About />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/pool/:poolId" element={<PoolLeaderboard />} />
              <Route path="/school/:schoolSlug" element={<SchoolProfile />} />
              <Route path="/tournament/:tournamentId" element={<Tournament />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/join-pool/:inviteCode" element={<JoinPool />} />
              <Route path="/consent/:token" element={<ParentConsent />} />
              <Route path="/how-scoring-works" element={<HowScoringWorks />} />
              <Route path="/learn-more" element={<LearnMore />} />
              <Route path="/school-setup/:token" element={<SchoolSetup />} />
              <Route path="/leaderboard/:type/:id" element={<LeaderboardDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </motion.div>
      )}
    </>
  );
};
