import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface School {
  id: string;
  name: string;
  province: string | null;
  website: string | null;
  icon_url: string | null;
  main_rival: string | null;
  established_year: number | null;
  springboks_count: number | null;
  trivia_fact: string | null;
  status: string;
}

interface SchoolsTableProps {
  onEdit: (school: School) => void;
}

export function SchoolsTable({ onEdit }: SchoolsTableProps) {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("name");

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
      toast({
        title: "Error",
        description: "Failed to load schools",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("schools").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "School deleted successfully",
      });
      
      fetchSchools();
    } catch (error) {
      console.error("Error deleting school:", error);
      toast({
        title: "Error",
        description: "Failed to delete school",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School Name</TableHead>
              <TableHead>Province</TableHead>
              <TableHead>Established</TableHead>
              <TableHead>Main Rival</TableHead>
              <TableHead>Springboks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No schools found
                </TableCell>
              </TableRow>
            ) : (
              schools.map((school) => (
                 <TableRow key={school.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {school.icon_url && (
                        <button
                          onClick={() => navigate(`/school/${school.id}`)}
                          className="h-8 w-8 rounded-full overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                        >
                          <img
                            src={school.icon_url}
                            alt={school.name}
                            className="h-full w-full object-contain"
                          />
                        </button>
                      )}
                      {school.name}
                    </div>
                  </TableCell>
                  <TableCell>{school.province || "-"}</TableCell>
                  <TableCell>{school.established_year || "-"}</TableCell>
                  <TableCell>{school.main_rival || "-"}</TableCell>
                  <TableCell>{school.springboks_count || 0}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        school.status === "verified"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {school.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(school)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(school.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the school
              from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
