import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface StepSchoolProps {
  schoolName: string;
  onNext: (schoolName: string) => void;
  onBack: () => void;
}

const StepSchool = ({ schoolName: initialSchool, onNext, onBack }: StepSchoolProps) => {
  const [schoolName, setSchoolName] = useState(initialSchool);
  const [schools, setSchools] = useState<{ id: string; name: string; status: string }[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<{ id: string; name: string; status: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAddingNewSchool, setIsAddingNewSchool] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    const { data, error } = await supabase
      .from("schools")
      .select("id, name, status")
      .eq("status", "verified")
      .order("name");

    if (!error && data) {
      setSchools(data);
    }
  };

  const handleInputChange = (value: string) => {
    setSchoolName(value);
    setIsAddingNewSchool(false);
    
    if (value.trim().length > 0) {
      const searchTerm = value.toLowerCase();
      const matches = schools.filter(school => 
        school.name.toLowerCase().includes(searchTerm)
      );
      setFilteredSchools(matches);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSchool = (school: { name: string }) => {
    setSchoolName(school.name);
    setShowSuggestions(false);
    setIsAddingNewSchool(false);
  };

  const handleAddNewSchool = async () => {
    if (!schoolName.trim()) return;

    const { error } = await supabase
      .from("schools")
      .insert({ name: schoolName.trim(), status: "pending" });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add school. It may already exist.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingNewSchool(true);
    setShowSuggestions(false);
    
    toast({
      title: "School Added!",
      description: "We'll review and add your school as soon as possible. You're good to go for now — your school will be marked as Pending until added.",
    });
  };

  const handleNext = () => {
    if (schoolName.trim()) {
      onNext(schoolName.trim());
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Which school do you represent?</h2>
        <p className="text-muted-foreground">Show your school pride</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2 relative">
          <Label htmlFor="school">School Name</Label>
          <Input
            id="school"
            type="text"
            placeholder="Start typing your school name..."
            value={schoolName}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
            onFocus={() => schoolName.length > 0 && setShowSuggestions(true)}
            autoFocus
          />
          
          {showSuggestions && filteredSchools.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredSchools.map((school) => (
                <button
                  key={school.id}
                  type="button"
                  onClick={() => selectSchool(school)}
                  className="w-full text-left px-4 py-2 hover:bg-muted transition-colors"
                >
                  {school.name}
                </button>
              ))}
              <button
                type="button"
                onClick={handleAddNewSchool}
                className="w-full text-left px-4 py-2 border-t border-border hover:bg-muted transition-colors flex items-center gap-2 text-primary"
              >
                <Plus className="w-4 h-4" />
                <span>Add My School: "{schoolName}"</span>
              </button>
            </div>
          )}

          {showSuggestions && filteredSchools.length === 0 && schoolName.trim().length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg">
              <button
                type="button"
                onClick={handleAddNewSchool}
                className="w-full text-left px-4 py-2 hover:bg-muted transition-colors flex items-center gap-2 text-primary"
              >
                <Plus className="w-4 h-4" />
                <span>Add My School: "{schoolName}"</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button onClick={handleNext} className="flex-1" disabled={!schoolName.trim()}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StepSchool;
