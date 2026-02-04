import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { GraduationCap, Users, Heart, Trophy, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const userTypes = [
  { value: "scholar", label: "Scholar", icon: GraduationCap, description: "Current student" },
  { value: "alumni", label: "Alumni", icon: Trophy, description: "Former student" },
  { value: "parent", label: "Parent", icon: Heart, description: "Parent of a student" },
  { value: "fan", label: "Fan", icon: Users, description: "Rugby enthusiast" },
];

// Generate year options from 1940 to current year
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1939 }, (_, i) => currentYear - i);

interface StepProfileProps {
  firstName: string;
  userType?: string;
  yearOfBirth?: number;
  schoolName: string;
  onNext: (data: { firstName: string; userType: string; yearOfBirth: number; schoolName: string }) => void;
  loading?: boolean;
}

const StepProfile = ({
  firstName: initialFirstName,
  userType: initialUserType,
  yearOfBirth: initialYearOfBirth,
  schoolName: initialSchoolName,
  onNext,
  loading,
}: StepProfileProps) => {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [userType, setUserType] = useState(initialUserType || "");
  const [yearOfBirth, setYearOfBirth] = useState<number | undefined>(initialYearOfBirth);
  const [schoolName, setSchoolName] = useState(initialSchoolName);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);

  // Fetch schools based on search
  useEffect(() => {
    const fetchSchools = async () => {
      if (schoolSearch.length < 2) {
        setSchools([]);
        return;
      }

      setSchoolsLoading(true);
      try {
        const { data, error } = await supabase
          .from("schools")
          .select("id, name")
          .ilike("name", `%${schoolSearch}%`)
          .eq("is_visible", true)
          .limit(10);

        if (error) throw error;
        setSchools(data || []);
      } catch (e) {
        console.error("Error fetching schools:", e);
        setSchools([]);
      } finally {
        setSchoolsLoading(false);
      }
    };

    const debounce = setTimeout(fetchSchools, 300);
    return () => clearTimeout(debounce);
  }, [schoolSearch]);

  const isValid = firstName.trim().length > 0 && userType && yearOfBirth && schoolName.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onNext({
        firstName: firstName.trim(),
        userType,
        yearOfBirth: yearOfBirth!,
        schoolName: schoolName.trim(),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Tell us about you</h2>
        <p className="text-muted-foreground">Help us personalize your experience</p>
      </div>

      <div className="space-y-5">
        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            placeholder="Enter your first name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            autoFocus
          />
        </div>

        {/* Account Type */}
        <div className="space-y-2">
          <Label>I am a...</Label>
          <div className="grid grid-cols-2 gap-2">
            {userTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = userType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setUserType(type.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("font-medium text-sm", isSelected ? "text-primary" : "text-foreground")}>
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Year of Birth */}
        <div className="space-y-2">
          <Label htmlFor="yearOfBirth">Year of birth</Label>
          <Select
            value={yearOfBirth?.toString() || ""}
            onValueChange={(value) => setYearOfBirth(parseInt(value))}
          >
            <SelectTrigger id="yearOfBirth">
              <SelectValue placeholder="Select your birth year" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* School */}
        <div className="space-y-2">
          <Label htmlFor="school">School</Label>
          <Popover open={schoolOpen} onOpenChange={setSchoolOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={schoolOpen}
                className="w-full justify-between font-normal"
              >
                {schoolName || "Search for your school..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Type to search schools..."
                  value={schoolSearch}
                  onValueChange={setSchoolSearch}
                />
                <CommandList>
                  {schoolsLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Searching...
                    </div>
                  ) : schools.length === 0 && schoolSearch.length >= 2 ? (
                    <CommandEmpty>
                      <div className="p-2 space-y-2">
                        <p>No schools found.</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSchoolName(schoolSearch);
                            setSchoolOpen(false);
                          }}
                        >
                          Use "{schoolSearch}" anyway
                        </Button>
                      </div>
                    </CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {schools.map((school) => (
                        <CommandItem
                          key={school.id}
                          value={school.name}
                          onSelect={() => {
                            setSchoolName(school.name);
                            setSchoolOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              schoolName === school.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {school.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={!isValid || loading}>
        {loading ? "Saving..." : "Create my account"}
      </Button>
    </form>
  );
};

export default StepProfile;
