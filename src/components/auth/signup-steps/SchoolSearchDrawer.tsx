import { useState, useEffect } from "react";
import { Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SchoolSearchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSchool: string;
  onSelectSchool: (school: string) => void;
}

const SchoolSearchDrawer = ({
  open,
  onOpenChange,
  selectedSchool,
  onSelectSchool,
}: SchoolSearchDrawerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch schools based on search
  useEffect(() => {
    const fetchSchools = async () => {
      if (searchQuery.length < 2) {
        setSchools([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("schools")
          .select("id, name")
          .ilike("name", `%${searchQuery}%`)
          .eq("is_visible", true)
          .limit(20);

        if (error) throw error;
        setSchools(data || []);
      } catch (e) {
        console.error("Error fetching schools:", e);
        setSchools([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSchools, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Reset search when drawer opens
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSchools([]);
    }
  }, [open]);

  const handleSelectSchool = (schoolName: string) => {
    onSelectSchool(schoolName);
    onOpenChange(false);
  };

  const handleUseCustomName = () => {
    if (searchQuery.trim()) {
      onSelectSchool(searchQuery.trim());
      onOpenChange(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle>Find Your School</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
          
          {/* Search Input - Fixed at top */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Type to search schools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </DrawerHeader>

        {/* Scrollable Results */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[200px] max-h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2" />
              Searching...
            </div>
          ) : schools.length > 0 ? (
            <div className="space-y-1">
              {schools.map((school) => (
                <button
                  key={school.id}
                  onClick={() => handleSelectSchool(school.name)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                    selectedSchool === school.name
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      selectedSchool === school.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-medium">{school.name}</span>
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">No schools found for "{searchQuery}"</p>
              <Button
                variant="outline"
                onClick={handleUseCustomName}
              >
                Use "{searchQuery}" anyway
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Start typing to search for your school
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SchoolSearchDrawer;
