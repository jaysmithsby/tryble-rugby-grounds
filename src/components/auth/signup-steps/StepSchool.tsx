import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { SchoolRequestModal } from "@/components/auth/SchoolRequestModal";

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
  const [requestModalOpen, setRequestModalOpen] = useState(false);

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
  };

  const handleNext = () => {
    if (schoolName.trim()) {
      onNext(schoolName.trim());
    }
  };

  const handleOpenRequestModal = () => {
    setShowSuggestions(false);
    setRequestModalOpen(true);
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
            </div>
          )}

          {showSuggestions && filteredSchools.length === 0 && schoolName.trim().length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg p-3 text-center">
              <p className="text-sm text-muted-foreground mb-2">No schools found</p>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleOpenRequestModal}
                className="text-primary p-0 h-auto"
              >
                Request to add "{schoolName}"
              </Button>
            </div>
          )}
        </div>

        {/* Can't find school link */}
        <p className="text-sm text-muted-foreground text-center">
          Can't find your school?{" "}
          <button
            type="button"
            onClick={handleOpenRequestModal}
            className="text-primary hover:underline font-medium"
          >
            Request to add it
          </button>
        </p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button onClick={handleNext} className="flex-1" disabled={!schoolName.trim()}>
            Continue
          </Button>
        </div>
      </div>

      <SchoolRequestModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        initialSchoolName={schoolName}
      />
    </div>
  );
};

export default StepSchool;
