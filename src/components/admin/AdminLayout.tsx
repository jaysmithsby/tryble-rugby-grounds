import { ReactNode, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, School, Users, Trophy, Megaphone, BarChart3, Plus, Layers, Search, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SchoolsTable } from "./SchoolsTable";
import { EditSchoolDialog } from "./EditSchoolDialog";
import { CreateSchoolDialog } from "./CreateSchoolDialog";
import { TournamentsTable } from "./TournamentsTable";
import { EditTournamentDialog } from "./EditTournamentDialog";
import { CreateTournamentDialog } from "./CreateTournamentDialog";
import { UsersTable } from "./UsersTable";
import { ReportsConsole } from "./ReportsConsole";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { PoolPacksTable } from "./PoolPacksTable";
import { CreatePoolPackDialog } from "./CreatePoolPackDialog";
import { EditPoolPackDialog } from "./EditPoolPackDialog";
import { SchoolRequestsTable } from "./SchoolRequestsTable";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AdminLayoutProps {
  children?: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [schoolsRefreshTrigger, setSchoolsRefreshTrigger] = useState(0);
  const [tournamentEditDialogOpen, setTournamentEditDialogOpen] = useState(false);
  const [tournamentCreateDialogOpen, setTournamentCreateDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [poolPackCreateDialogOpen, setPoolPackCreateDialogOpen] = useState(false);
  const [poolPackEditDialogOpen, setPoolPackEditDialogOpen] = useState(false);
  const [selectedPoolPack, setSelectedPoolPack] = useState<any>(null);

  const handleEditSchool = (school: any) => {
    setSelectedSchool(school);
    setEditDialogOpen(true);
  };

  const handleSchoolSuccess = () => {
    setSchoolsRefreshTrigger(prev => prev + 1);
  };

  const handleEditTournament = (tournament: any) => {
    setSelectedTournament(tournament);
    setTournamentEditDialogOpen(true);
  };

  const handleEditPoolPack = (pack: any) => {
    setSelectedPoolPack(pack);
    setPoolPackEditDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage Tryble platform content and users</p>
          </div>
          <ThemeToggle />
        </div>

        <Tabs defaultValue="fixtures" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto">
            <TabsTrigger value="fixtures" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Fixtures</span>
            </TabsTrigger>
            <TabsTrigger value="schools" className="gap-2">
              <School className="h-4 w-4" />
              <span className="hidden sm:inline">Schools</span>
            </TabsTrigger>
            <TabsTrigger value="school-requests" className="gap-2">
              <FileQuestion className="h-4 w-4" />
              <span className="hidden sm:inline">Requests</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Tournaments</span>
            </TabsTrigger>
            <TabsTrigger value="pool-packs" className="gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Pool Packs</span>
            </TabsTrigger>
            <TabsTrigger value="ads" className="gap-2">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Ads</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fixtures" className="space-y-4">
            {children}
          </TabsContent>

          <TabsContent value="schools" className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Schools Manager</h2>
                <p className="text-muted-foreground mt-1">Manage school profiles, crests, regions, and visibility settings</p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New School
              </Button>
            </div>
            <SchoolsTable onEdit={handleEditSchool} refreshTrigger={schoolsRefreshTrigger} />
          </TabsContent>

          <TabsContent value="school-requests" className="space-y-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">School Requests</h2>
              <p className="text-muted-foreground mt-1">Review and approve user-submitted school requests</p>
            </div>
            <SchoolRequestsTable />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">User Management</h2>
              <p className="text-muted-foreground mt-1">View and manage user accounts, permissions, and activity</p>
            </div>
            
            <UsersTable />
            
            <div className="pt-6 border-t">
              <ReportsConsole />
            </div>
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Tournaments Manager</h2>
                <p className="text-muted-foreground mt-1">Create and manage rugby tournaments and festival fixtures</p>
              </div>
              <Button onClick={() => setTournamentCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Tournament
              </Button>
            </div>
            <TournamentsTable onEdit={handleEditTournament} />
          </TabsContent>

          <TabsContent value="pool-packs" className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Pool Packs Manager</h2>
                <p className="text-muted-foreground mt-1">Create and manage curated school collections for user pools</p>
              </div>
              <Button onClick={() => setPoolPackCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Pool Pack
              </Button>
            </div>
            <PoolPacksTable onEdit={handleEditPoolPack} />
          </TabsContent>

          <TabsContent value="ads" className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Ads & Sponsors Manager</h2>
                <p className="text-muted-foreground mt-1">Manage sponsor banners, ad placements, and campaign analytics</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by campaign name, sponsor, or tournament..."
                    disabled
                    className="pl-10"
                  />
                </div>
                <Select disabled>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border border-border bg-card p-12 text-center">
                <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Ad Campaigns Yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Manage sponsor banners, ad placements, and campaign analytics. This feature is coming soon.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>

      <EditSchoolDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        school={selectedSchool}
        onSuccess={handleSchoolSuccess}
      />

      <CreateSchoolDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleSchoolSuccess}
      />

      <EditTournamentDialog
        open={tournamentEditDialogOpen}
        onOpenChange={setTournamentEditDialogOpen}
        tournament={selectedTournament}
      />

      <CreateTournamentDialog
        open={tournamentCreateDialogOpen}
        onOpenChange={setTournamentCreateDialogOpen}
      />

      <CreatePoolPackDialog
        open={poolPackCreateDialogOpen}
        onOpenChange={setPoolPackCreateDialogOpen}
        onSuccess={() => {
          setPoolPackCreateDialogOpen(false);
        }}
      />

      <EditPoolPackDialog
        open={poolPackEditDialogOpen}
        onOpenChange={setPoolPackEditDialogOpen}
        pack={selectedPoolPack}
        onSuccess={() => {
          setPoolPackEditDialogOpen(false);
        }}
      />
    </div>
  );
}
