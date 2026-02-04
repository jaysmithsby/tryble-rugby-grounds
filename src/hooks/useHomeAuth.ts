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
  userDisplayName: string | null;
  handleSignOut: () => Promise<void>;
}

export function useHomeAuth(): UseHomeAuthResult {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [userSchoolName, setUserSchoolName] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted) return;
      
      if (!user) {
        navigate("/auth");
        return;
      }
      
      setUser(user);
      
      // Fetch user's profile info
      supabase
        .from("profiles")
        .select("school_name, display_name, first_name")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!isMounted) return;
          const schoolName = data?.school_name || null;
          const displayName = data?.display_name || data?.first_name || null;
          setUserSchoolName(schoolName);
          setUserDisplayName(displayName);
          setProfileLoaded(true);
          setLoading(false);
        });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      
      if (!session) {
        navigate("/auth");
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session.user);
        // Fetch user's profile info
        supabase
          .from("profiles")
          .select("school_name, display_name, first_name")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (!isMounted) return;
            const schoolName = data?.school_name || null;
            const displayName = data?.display_name || data?.first_name || null;
            setUserSchoolName(schoolName);
            setUserDisplayName(displayName);
            setProfileLoaded(true);
          });
      }
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
    userDisplayName,
    handleSignOut,
  };
}
