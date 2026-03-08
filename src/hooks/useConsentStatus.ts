import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import { CACHE_TIMES } from "@/lib/queryConfig";

interface ConsentStatus {
  isMinor: boolean;
  consentStatus: "pending" | "verified" | "expired" | null;
  needsConsent: boolean;
  parentEmail: string | null;
  maskedEmail: string | null;
  canChangeEmail: boolean;
  changesRemaining: number;
  nextChangeAt: Date | null;
  isLoading: boolean;
  yearOfBirth: number | null;
  userSchoolName: string | null;
  userSchoolId: string | null;
}

function maskEmail(email: string): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function calculateIsMinor(yearOfBirth: number | null): boolean {
  if (!yearOfBirth) return false;
  const currentYear = new Date().getFullYear();
  // If they're turning 18 in the current year, they're treated as adult
  return currentYear - yearOfBirth < 18;
}

export function useConsentStatus(): ConsentStatus & {
  sendConsentEmail: (parentEmail: string, childFirstName: string, isUpdate?: boolean) => Promise<boolean>;
  refetch: () => void;
} {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile data
  const { data: profileData, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ["profile-consent-status"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("year_of_birth, consent_status, parent_email, school_name_legacy, school_id, schools(name)")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      return {
        yearOfBirth: data.year_of_birth,
        consentStatus: data.consent_status as "pending" | "verified" | "expired" | null,
        parentEmail: data.parent_email,
        userSchoolName: (data.schools as any)?.name || data.school_name_legacy,
        userSchoolId: data.school_id as string | null,
      };
    },
    staleTime: CACHE_TIMES.USER_PROFILE, // Profile data doesn't change often
  });

  // Fetch email change eligibility
  const { data: changeEligibility, isLoading: eligibilityLoading } = useQuery({
    queryKey: ["consent-change-eligibility"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .rpc("can_change_parent_email", { p_user_id: user.id });

      if (error) {
        console.error("Error checking change eligibility:", error);
        return { can_change: true, changes_remaining: 3, next_change_at: null };
      }

      return data?.[0] || { can_change: true, changes_remaining: 3, next_change_at: null };
    },
    staleTime: CACHE_TIMES.VOLATILE, // Eligibility is time-sensitive
    enabled: !!profileData?.yearOfBirth && calculateIsMinor(profileData.yearOfBirth),
  });

  // Send consent email mutation
  const sendConsentMutation = useMutation({
    mutationFn: async ({ parentEmail, childFirstName, isUpdate }: { 
      parentEmail: string; 
      childFirstName: string;
      isUpdate?: boolean;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("send-parental-consent", {
        body: { parentEmail, childFirstName, isUpdate },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send consent email");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-consent-status"] });
      queryClient.invalidateQueries({ queryKey: ["consent-change-eligibility"] });
      toast({
        title: "Consent email sent!",
        description: "Ask your parent/guardian to check their email.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendConsentEmail = useCallback(async (
    parentEmail: string, 
    childFirstName: string,
    isUpdate?: boolean
  ): Promise<boolean> => {
    try {
      await sendConsentMutation.mutateAsync({ parentEmail, childFirstName, isUpdate });
      return true;
    } catch {
      return false;
    }
  }, [sendConsentMutation]);

  const refetch = useCallback(() => {
    refetchProfile();
    queryClient.invalidateQueries({ queryKey: ["consent-change-eligibility"] });
  }, [refetchProfile, queryClient]);

  const isMinor = calculateIsMinor(profileData?.yearOfBirth || null);
  const needsConsent = isMinor && profileData?.consentStatus !== "verified";

  return {
    isMinor,
    consentStatus: profileData?.consentStatus || null,
    needsConsent,
    parentEmail: profileData?.parentEmail || null,
    maskedEmail: profileData?.parentEmail ? maskEmail(profileData.parentEmail) : null,
    canChangeEmail: changeEligibility?.can_change ?? true,
    changesRemaining: changeEligibility?.changes_remaining ?? 3,
    nextChangeAt: changeEligibility?.next_change_at 
      ? new Date(changeEligibility.next_change_at) 
      : null,
    isLoading: profileLoading || eligibilityLoading,
    yearOfBirth: profileData?.yearOfBirth || null,
    userSchoolName: profileData?.userSchoolName || null,
    userSchoolId: profileData?.userSchoolId || null,
    sendConsentEmail,
    refetch,
  };
}
