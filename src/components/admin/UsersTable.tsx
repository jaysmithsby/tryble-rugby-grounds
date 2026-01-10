import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { UserActionsDropdown } from "./UserActionsDropdown";
import { format } from "date-fns";

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
    school_name: string;
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch all profiles (this is the source of truth for users)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        console.log('No profiles found in database');
        setUsers([]);
        setSchools([]);
        setLoading(false);
        return;
      }

      // Fetch active sanctions
      const { data: sanctions, error: sanctionsError } = await supabase
        .from('user_sanctions')
        .select('*')
        .eq('is_active', true);
      if (sanctionsError) console.error('Error fetching sanctions:', sanctionsError);

      // Fetch user scores
      const { data: scores, error: scoresError } = await supabase
        .from('user_scores')
        .select('user_id, predictions_made, predictions_correct');
      if (scoresError) console.error('Error fetching scores:', scoresError);

      // Fetch pool memberships count
      const { data: poolMemberships, error: poolError } = await supabase
        .from('pool_members')
        .select('user_id');
      if (poolError) console.error('Error fetching pool memberships:', poolError);

      // Fetch badges count
      const { data: userBadges, error: badgesError } = await supabase
        .from('user_badges')
        .select('user_id');
      if (badgesError) console.error('Error fetching badges:', badgesError);

      // Build users from profiles (profiles table is the source of truth)
      const combinedUsers: UserData[] = profiles.map(profile => {
        const userSanctions = sanctions?.filter(s => s.user_id === profile.id) || [];
        const userScores = scores?.find(s => s.user_id === profile.id) || null;
        const poolCount = poolMemberships?.filter(pm => pm.user_id === profile.id).length || 0;
        const badgeCount = userBadges?.filter(b => b.user_id === profile.id).length || 0;

        return {
          id: profile.id,
          email: profile.contact_method === 'email' ? profile.contact_value : '',
          created_at: profile.created_at,
          profile: {
            username: profile.username,
            display_name: profile.display_name,
            first_name: profile.first_name,
            school_name: profile.school_name,
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

      // Extract unique schools for filter
      const uniqueSchools = [...new Set(profiles.map(p => p.school_name).filter(Boolean))];
      setSchools(uniqueSchools as string[]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // Get active sanction helper
  const getActiveSanctionType = (sanctions: UserData['sanctions']) => {
    const active = sanctions.find(s => s.is_active);
    return active?.sanction_type || null;
  };

  const filteredAndSortedUsers = useMemo(() => {
    const filtered = users.filter(user => {
      const query = searchTerm.toLowerCase();
      const activeSanctionType = getActiveSanctionType(user.sanctions);
      
      const matchesSearch = 
        searchTerm === '' ||
        user.profile?.display_name?.toLowerCase().includes(query) ||
        user.profile?.username?.toLowerCase().includes(query) ||
        user.profile?.first_name?.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.profile?.school_name?.toLowerCase().includes(query) ||
        user.profile?.account_type?.toLowerCase().includes(query) ||
        (activeSanctionType && activeSanctionType.toLowerCase().includes(query)) ||
        (query.includes('ban') && activeSanctionType === 'ban') ||
        (query.includes('suspend') && activeSanctionType === 'suspension');

      const matchesSchool = schoolFilter === 'all' || user.profile?.school_name === schoolFilter;
      const matchesAgeBand = ageBandFilter === 'all' || user.profile?.age_band === ageBandFilter;
      const matchesConsent = consentFilter === 'all' || user.profile?.consent_status === consentFilter;

      return matchesSearch && matchesSchool && matchesAgeBand && matchesConsent;
    });

    // Sort results
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'display_name':
          const nameA = a.profile?.display_name || a.profile?.first_name || '';
          const nameB = b.profile?.display_name || b.profile?.first_name || '';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'username':
          const userA = a.profile?.username || '';
          const userB = b.profile?.username || '';
          comparison = userA.localeCompare(userB);
          break;
        case 'school':
          const schoolA = a.profile?.school_name || '';
          const schoolB = b.profile?.school_name || '';
          comparison = schoolA.localeCompare(schoolB);
          break;
        case 'age_band':
          const ageA = a.profile?.age_band || '';
          const ageB = b.profile?.age_band || '';
          comparison = ageA.localeCompare(ageB);
          break;
        case 'joined':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'type':
          const typeA = a.profile?.account_type || '';
          const typeB = b.profile?.account_type || '';
          comparison = typeA.localeCompare(typeB);
          break;
        case 'consent':
          const consentA = a.profile?.consent_status || '';
          const consentB = b.profile?.consent_status || '';
          comparison = consentA.localeCompare(consentB);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'sanction':
          const sanctionA = getActiveSanctionType(a.sanctions) || '';
          const sanctionB = getActiveSanctionType(b.sanctions) || '';
          comparison = sanctionA.localeCompare(sanctionB);
          break;
        case 'predictions':
          const predA = a.scores?.predictions_made || 0;
          const predB = b.scores?.predictions_made || 0;
          comparison = predA - predB;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [users, searchTerm, schoolFilter, ageBandFilter, consentFilter, sortField, sortDirection]);

  if (loading) {
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
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('sanction')}
              >
                <div className="flex items-center">
                  Sanction
                  {getSortIcon('sanction')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('predictions')}
              >
                <div className="flex items-center">
                  Activity
                  {getSortIcon('predictions')}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <p>
                      {users.length === 0
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
              filteredAndSortedUsers.map(user => (
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

      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedUsers.length} of {users.length} users
      </div>
    </div>
  );
}