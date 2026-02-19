import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { useVerifiedSchoolNames } from "@/hooks/useSchoolsQuery";

interface SchoolRivalComboboxProps {
  value: string;
  onChange: (value: string) => void;
  excludeSchool?: string;
  className?: string;
}

export function SchoolRivalCombobox({
  value,
  onChange,
  excludeSchool,
  className,
}: SchoolRivalComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { schoolNames } = useVerifiedSchoolNames();

  const filteredSchools = useMemo(() => {
    return schoolNames.filter(
      (name) => name.toLowerCase() !== excludeSchool?.toLowerCase()
    );
  }, [schoolNames, excludeSchool]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">
            {value || "Select or type rival..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder="Search schools..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.trim() ? (
                <button
                  type="button"
                  className="w-full px-2 py-3 text-sm text-left hover:bg-accent rounded cursor-pointer"
                  onClick={() => {
                    onChange(search.trim());
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  Use "<span className="font-medium">{search.trim()}</span>" as rival
                </button>
              ) : (
                "No schools found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredSchools.map((name) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => {
                    onChange(name);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
