/**
 * React Query Configuration
 * 
 * Centralized cache timing constants for consistent data fetching behavior.
 * Use these constants across all useQuery hooks for maintainability.
 * 
 * CACHING STRATEGY:
 * - STATIC: Rarely changes (schools, provinces) - 10 min stale, 30 min cache
 * - REFERENCE: Occasionally updates (pool memberships) - 5 min stale
 * - USER_PROFILE: User-specific data - 5 min stale
 * - DYNAMIC: Frequently updates (fixtures, predictions) - 2 min stale
 * - VOLATILE: Time-sensitive (rate limits, consent) - 1 min stale
 * - REALTIME: Should refetch often - 30 sec stale
 * - FORM: Short-lived for form interactions - 10 sec stale
 */

// Cache durations in milliseconds
export const CACHE_TIMES = {
  /** Static data that rarely changes (schools list, provinces) - 10 minutes */
  STATIC: 10 * 60 * 1000,
  
  /** Reference data that may update occasionally (pool memberships) - 5 minutes */
  REFERENCE: 5 * 60 * 1000,
  
  /** User-specific data (profile, preferences) - 5 minutes */
  USER_PROFILE: 5 * 60 * 1000,
  
  /** Frequently updated data (fixtures, predictions) - 2 minutes */
  DYNAMIC: 2 * 60 * 1000,
  
  /** Time-sensitive data (consent eligibility, rate limits) - 1 minute */
  VOLATILE: 60 * 1000,
  
  /** Real-time data (should refetch often) - 30 seconds */
  REALTIME: 30 * 1000,
  
  /** Short-lived data for form interactions - 10 seconds */
  FORM: 10 * 1000,
} as const;

// Garbage collection times (how long to keep in cache after becoming unused)
export const GC_TIMES = {
  /** Long-lived cache entries - 30 minutes */
  LONG: 30 * 60 * 1000,
  
  /** Standard cache entries - 10 minutes */
  STANDARD: 10 * 60 * 1000,
  
  /** Short-lived cache entries - 5 minutes */
  SHORT: 5 * 60 * 1000,
} as const;

/**
 * Default query options for different data types
 * Apply these as base configurations for queries
 */
export const DEFAULT_QUERY_OPTIONS = {
  /** For static reference data like schools, provinces */
  static: {
    staleTime: CACHE_TIMES.STATIC,
    gcTime: GC_TIMES.LONG,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  
  /** For user profile and preferences */
  userProfile: {
    staleTime: CACHE_TIMES.USER_PROFILE,
    gcTime: GC_TIMES.STANDARD,
    refetchOnMount: false,
  },
  
  /** For fixtures, tournaments, matches */
  dynamic: {
    staleTime: CACHE_TIMES.DYNAMIC,
    gcTime: GC_TIMES.STANDARD,
  },
  
  /** For predictions and user actions */
  volatile: {
    staleTime: CACHE_TIMES.VOLATILE,
    gcTime: GC_TIMES.SHORT,
  },
} as const;
