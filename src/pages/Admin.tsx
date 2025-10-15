import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FixturesTable } from "@/components/admin/FixturesTable";
import { CreateFixtureDialog } from "@/components/admin/CreateFixtureDialog";
import { EditFixtureDialog } from "@/components/admin/EditFixtureDialog";
import { ImportFixturesButton } from "@/components/admin/ImportFixturesButton";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { BottomNav } from "@/components/BottomNav";

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<any>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        navigate('/auth');
        return;
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (rolesError) {
        console.error('Error checking admin role:', rolesError);
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate('/home');
        return;
      }

      if (!roles) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate('/home');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  const handleEditFixture = (fixture: any) => {
    setSelectedFixture(fixture);
    setEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <AdminLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Fixtures Manager</h2>
            <p className="text-muted-foreground mt-1">Manage rugby fixtures and match results</p>
          </div>
          <div className="flex gap-2">
            <ImportFixturesButton />
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Fixture
            </Button>
          </div>
        </div>

        <FixturesTable onEdit={handleEditFixture} />

        <CreateFixtureDialog 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen} 
        />

        <EditFixtureDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          fixture={selectedFixture}
        />
      </AdminLayout>
      <BottomNav />
    </>
  );
}
