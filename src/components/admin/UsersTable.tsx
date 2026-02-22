import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { UserActionsDropdown } from "./UserActionsDropdown";
import { format } from "date-fns";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "./PaginationControls";
import { useDebounce } from "@/hooks/use-debounce";

type SortField = 'display_name' | 'username' | 'school' | 'age_band' | 'joined' | 'type' | 'consent' | 'email' | 'sanction' | 'predictions';
type SortDirection = 'asc' | 'desc';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  profile: {
    username: string | null;
    display_name: string | null;
    first_name: string;
    school_name: string; // resolved from join or legacy
    age_band: string | null;
    account_type: string;
    consent_status: string;
    parent_email: string | null;
    country: string | null;
    province: string | null;
  } | null;
  sanctions: Array<{
    sanction_type: string;
    duration_days: number | null;
    expires_at: string | null;
    is_active: boolean;
  }>;
  scores: {
    predictions_made: number;
    predictions_correct: number;
  } | null;
  pools: number;
  badges: number;
}

export function UsersTable() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [ageBandFilter, setAgeBandFilter] = useState<string>("all");
  const [consentFilter, setConsentFilter] = useState<string>("all");
  const [schools, setSchools] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('joined');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const pagination = usePagination(1, 25);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    // Reset to first page when sorting changes
    pagination.goToPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    pagination.goToPage(1);
  }, [debouncedSearch, schoolFilter, ageBandFilter, consentFilter]);

  // Fetch users with server-side pagination
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      // Build the base query for count
      let countQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Apply filters to count query
      if (schoolFilter !== 'all') {
        countQuery = countQuery.eq('school_name_legacy', schoolFilter);
      }
      if (ageBandFilter !== 'all') {
        countQuery = countQuery.eq('age_band', ageBandFilter);
      }
      if (consentFilter !== 'all') {
        countQuery = countQuery.eq('consent_status', consentFilter);
      }
      if (debouncedSearch) {
        countQuery = countQuery.or(
          `display_name.ilike.%${debouncedSearch}%,username.ilike.%${debouncedSearch}%,first_name.ilike.%${debouncedSearch}%,school_name_legacy.ilike.%${debouncedSearch}%,contact_value.ilike.%${debouncedSearch}%`
        );
      }

      const { count, error: countError } = await countQuery;
      
      if (countError) {
        console.error('Error getting count:', countError);
      }

      pagination.setTotalCount(count || 0);

      // Build the data query with pagination
      let dataQuery = supabase
        .from('profiles')
        .select('*, schools(name)');

      // Apply the same filters
      if (schoolFilter !== 'all') {
        dataQuery = dataQuery.eq('school_name_legacy', schoolFilter);
      }
      if (ageBandFilter !== 'all') {
        dataQuery = dataQuery.eq('age_band', ageBandFilter);
      }
      if (consentFilter !== 'all') {
        dataQuery = dataQuery.eq('consent_status', consentFilter);
      }
      if (debouncedSearch) {
        dataQuery = dataQuery.or(
          `display_name.ilike.%${debouncedSearch}%,username.ilike.%${debouncedSearch}%,first_name.ilike.%${debouncedSearch}%,school_name_legacy.ilike.%${debouncedSearch}%,contact_value.ilike.%${debouncedSearch}%`
        );
      }

      // Apply sorting
      const sortColumn = sortField === 'joined' ? 'created_at' 
        : sortField === 'school' ? 'school_name_legacy'
        : sortField === 'type' ? 'account_type'
        : sortField === 'consent' ? 'consent_status'
        : sortField === 'email' ? 'contact_value'
        : sortField;
      
      dataQuery = dataQuery.order(sortColumn, { ascending: sortDirection === 'asc' });

      // Apply pagination
      dataQuery = dataQuery.range(pagination.from, pagination.to);

      const { data: profiles, error: profilesError } = await dataQuery;
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const profileIds = profiles.map(p => p.id);

      // Fetch related data for the current page only
      const [sanctionsResult, scoresResult, poolsResult, badgesResult] = await Promise.all([
        supabase
          .from('user_sanctions')
          .select('*')
          .eq('is_active', true)
          .in('user_id', profileIds),
        supabase
          .from('user_scores')
          .select('user_id, predictions_made, predictions_correct')
          .in('user_id', profileIds),
        supabase
          .from('pool_members')
          .select('user_id')
          .in('user_id', profileIds),
        supabase
          .from('user_badges')
          .select('user_id')
          .in('user_id', profileIds),
      ]);

      const sanctions = sanctionsResult.data || [];
      const scores = scoresResult.data || [];
      const poolMemberships = poolsResult.data || [];
      const userBadges = badgesResult.data || [];

      // Build users from profiles
      const combinedUsers: UserData[] = profiles.map(profile => {
        const userSanctions = sanctions.filter(s => s.user_id === profile.id);
        const userScores = scores.find(s => s.user_id === profile.id) || null;
        const poolCount = poolMemberships.filter(pm => pm.user_id === profile.id).length;
        const badgeCount = userBadges.filter(b => b.user_id === profile.id).length;

          return {
          id: profile.id,
          email: profile.contact_method === 'email' ? profile.contact_value : '',
          created_at: profile.created_at,
          profile: {
            username: profile.username,
            display_name: profile.display_name,
            first_name: profile.first_name,
            school_name: (profile.schools as any)?.name || profile.school_name_legacy || '',
            age_band: profile.age_band,
            account_type: profile.account_type || 'adult',
            consent_status: profile.consent_status || 'pending',
            parent_email: profile.parent_email,
            country: profile.country,
            province: profile.province,
          },
          sanctions: userSanctions,
          scores: userScores,
          pools: poolCount,
          badges: badgeCount,
        };
      });

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.from, pagination.to, debouncedSearch, schoolFilter, ageBandFilter, consentFilter, sortField, sortDirection]);

  // Fetch schools list for filter (one-time)
  useEffect(() => {
    const fetchSchools = async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('name')
        .eq('is_visible', true)
        .eq('is_archived', false)
        .order('name');
      
      if (!error && data) {
        setSchools(data.map(s => s.name));
      }
    };
    fetchSchools();
  }, []);

  // Fetch users when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getActiveSanction = (sanctions: UserData['sanctions']) => {
    const active = sanctions.find(s => s.is_active);
    if (!active) return null;
    
    if (active.sanction_type === 'ban') return 'Permanent Ban';
    if (active.expires_at) {
      const expiresDate = new Date(active.expires_at);
      const now = new Date();
      const daysLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `Suspended (${daysLeft} days left)`;
    }
    return active.sanction_type;
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, username, email, or school..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={schoolFilter} onValueChange={setSchoolFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Schools" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schools</SelectItem>
            {schools.map(school => (
              <SelectItem key={school} value={school}>{school}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ageBandFilter} onValueChange={setAgeBandFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Ages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            <SelectItem value="U13">U13</SelectItem>
            <SelectItem value="13-15">13-15</SelectItem>
            <SelectItem value="16-17">16-17</SelectItem>
            <SelectItem value="18+">18+</SelectItem>
          </SelectContent>
        </Select>

        <Select value={consentFilter} onValueChange={setConsentFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Consent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Consent</SelectItem>
            <SelectItem value="verified">✅ Verified</SelectItem>
            <SelectItem value="pending">❌ Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('display_name')}
              >
                <div className="flex items-center">
                  Display Name
                  {getSortIcon('display_name')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('username')}
              >
                <div className="flex items-center">
                  Username
                  {getSortIcon('username')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('school')}
              >
                <div className="flex items-center">
                  School
                  {getSortIcon('school')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('age_band')}
              >
                <div className="flex items-center">
                  Age Band
                  {getSortIcon('age_band')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('joined')}
              >
                <div className="flex items-center">
                  Joined
                  {getSortIcon('joined')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center">
                  Type
                  {getSortIcon('type')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('consent')}
              >
                <div className="flex items-center">
                  Consent
                  {getSortIcon('consent')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center">
                  Email
                  {getSortIcon('email')}
                </div>
              </TableHead>
              <TableHead>Sanction</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <p>
                      {pagination.totalCount === 0
                        ? "No users found"
                        : "No matches found for your search"}
                    </p>
                    {(searchTerm || schoolFilter !== 'all' || ageBandFilter !== 'all' || consentFilter !== 'all') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm('');
                          setSchoolFilter('all');
                          setAgeBandFilter('all');
                          setConsentFilter('all');
                        }}
                        className="gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.profile?.display_name || user.profile?.first_name || 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.profile?.username || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{user.profile?.school_name || 'N/A'}</div>
                      {user.profile?.country && (
                        <div className="text-xs text-muted-foreground">{user.profile.country}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.profile?.age_band || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(user.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.profile?.account_type === 'minor' ? 'secondary' : 'default'}>
                      {user.profile?.account_type || 'adult'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.profile?.consent_status === 'verified' ? '✅' : '❌'}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{user.email}</div>
                    {user.profile?.parent_email && (
                      <div className="text-xs text-muted-foreground">P: {user.profile.parent_email}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {getActiveSanction(user.sanctions) ? (
                      <Badge variant="destructive">{getActiveSanction(user.sanctions)}</Badge>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="space-y-1">
                      <div>Predictions: {user.scores?.predictions_made || 0}</div>
                      <div>Pools: {user.pools}</div>
                      <div>Badges: {user.badges}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <UserActionsDropdown user={user} onUpdate={fetchUsers} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <PaginationControls pagination={pagination} loading={loading} />
    </div>
  );
}
