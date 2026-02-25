/**
 * Hook for managing user authentication state
 * Extracts auth logic from Home.tsx for better separation of concerns
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UseHomeAuthResult {
  user: User | null;
  loading: boolean;
  profileLoaded: boolean;
  userSchoolName: string | null;
  userSchoolId: string | null;
  userDisplayName: string | null;
  handleSignOut: () => Promise<void>;
}

export function useHomeAuth(): UseHomeAuthResult {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [userSchoolName, setUserSchoolName] = useState<string | null>(null);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = (userId: string) => {
      supabase
        .from("profiles")
        .select("school_name_legacy, school_id, display_name, first_name, schools(name)")
        .eq("id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (!isMounted) return;
          const schoolName = (data?.schools as any)?.name || data?.school_name_legacy || null;
          const displayName = data?.display_name || data?.first_name || null;
          setUserSchoolName(schoolName);
          setUserSchoolId(data?.school_id || null);
          setUserDisplayName(displayName);
          setProfileLoaded(true);
          setLoading(false);
        });
    };

    // Set up listener BEFORE checking session (recommended pattern)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        fetchProfile(session.user.id);
      }
    });

    // Local-first session check (no network call, uses persisted session)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      fetchProfile(session.user.id);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return {
    user,
    loading,
    profileLoaded,
    userSchoolName,
    userSchoolId,
    userDisplayName,
    handleSignOut,
  };
}
