import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { UserActionsDropdown } from "./UserActionsDropdown";
import { format } from "date-fns";

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch all users with their auth data
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      if (profilesError) throw profilesError;

      // Fetch active sanctions
      const { data: sanctions, error: sanctionsError } = await supabase
        .from('user_sanctions')
        .select('*')
        .eq('is_active', true);
      if (sanctionsError) throw sanctionsError;

      // Fetch user scores
      const { data: scores, error: scoresError } = await supabase
        .from('user_scores')
        .select('user_id, predictions_made, predictions_correct');
      if (scoresError) throw scoresError;

      // Fetch pool memberships count
      const { data: poolMemberships, error: poolError } = await supabase
        .from('pool_members')
        .select('user_id');
      if (poolError) throw poolError;

      // Fetch badges count
      const { data: userBadges, error: badgesError } = await supabase
        .from('user_badges')
        .select('user_id');
      if (badgesError) throw badgesError;

      // Combine all data
      const combinedUsers: UserData[] = authUsers.users.map(user => {
        const profile = profiles?.find(p => p.id === user.id) || null;
        const userSanctions = sanctions?.filter(s => s.user_id === user.id) || [];
        const userScores = scores?.find(s => s.user_id === user.id) || null;
        const poolCount = poolMemberships?.filter(pm => pm.user_id === user.id).length || 0;
        const badgeCount = userBadges?.filter(b => b.user_id === user.id).length || 0;

        return {
          id: user.id,
          email: user.email || '',
          created_at: user.created_at,
          profile,
          sanctions: userSanctions,
          scores: userScores,
          pools: poolCount,
          badges: badgeCount,
        };
      });

      setUsers(combinedUsers);

      // Extract unique schools for filter
      const uniqueSchools = [...new Set(profiles?.map(p => p.school_name).filter(Boolean))];
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.profile?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profile?.school_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSchool = schoolFilter === 'all' || user.profile?.school_name === schoolFilter;
    const matchesAgeBand = ageBandFilter === 'all' || user.profile?.age_band === ageBandFilter;
    const matchesConsent = consentFilter === 'all' || user.profile?.consent_status === consentFilter;

    return matchesSearch && matchesSchool && matchesAgeBand && matchesConsent;
  });

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
              <TableHead>Display Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Age Band</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Consent</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Sanction</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map(user => (
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
        Showing {filteredUsers.length} of {users.length} users
      </div>
    </div>
  );
}