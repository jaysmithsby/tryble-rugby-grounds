import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Eagerly loaded (landing + auth)
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";

// Lazy loaded app pages
const Home = lazy(() => import("@/pages/Home"));
const Fixtures = lazy(() => import("@/pages/Fixtures"));
const Profile = lazy(() => import("@/pages/Profile"));
const Pools = lazy(() => import("@/pages/Pools"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
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

// Info pages
const ForSchools = lazy(() => import("@/pages/ForSchools"));
const ForParents = lazy(() => import("@/pages/ForParents"));
const ForPlayers = lazy(() => import("@/pages/ForPlayers"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const PrivacyNote = lazy(() => import("@/pages/PrivacyNote"));
const Terms = lazy(() => import("@/pages/Terms"));
const About = lazy(() => import("@/pages/About"));

const PageFallback = () => (
  <div className="min-h-screen bg-background p-4 space-y-4">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full rounded-lg" />
    <Skeleton className="h-40 w-full rounded-lg" />
  </div>
);

const pageVariants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeInOut" as const,
  duration: 0.2,
};

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        className="min-h-screen"
      >
        <Suspense fallback={<PageFallback />}>
          <Routes location={location}>
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
            <Route path="/school-setup/:token" element={<SchoolSetup />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
};
