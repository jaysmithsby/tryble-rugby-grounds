import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { saProvinces } from "@/data/saProvinces";

const formSchema = z.object({
  name: z.string().min(1, "Tournament name is required"),
  host_school: z.string().min(1, "Host school is required"),
  venue: z.string().min(1, "Venue is required"),
  province: z.string().optional(),
  format_notes: z.string().optional(),
  sponsor_name: z.string().optional(),
});

interface CreateTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateTournamentDialog({ open, onOpenChange, onSuccess }: CreateTournamentDialogProps) {
  const [schools, setSchools] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState<string>("");
  const [hostSchoolOpen, setHostSchoolOpen] = useState(false);
  const [hostSchoolSearch, setHostSchoolSearch] = useState("");
  const [newHostSchoolName, setNewHostSchoolName] = useState("");
  const [showAddHostSchool, setShowAddHostSchool] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", host_school: "", venue: "", province: "", format_notes: "", sponsor_name: "",
    },
  });

  useEffect(() => {
    if (open) fetchSchools();
  }, [open]);

  const fetchSchools = async () => {
    const { data, error } = await supabase.from("schools").select("name").order("name");
    if (!error) setSchools(data?.map((s) => s.name) || []);
  };

  const filteredHostSchools = useMemo(() => {
    if (!hostSchoolSearch) return schools;
    return schools.filter((s) => s.toLowerCase().includes(hostSchoolSearch.toLowerCase()));
  }, [schools, hostSchoolSearch]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("tournament-sponsors").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("tournament-sponsors").getPublicUrl(fileName);
      setSponsorLogoUrl(publicUrl);
      toast({ title: "Success", description: "Sponsor logo uploaded" });
    } catch (error) {
      toast({ title: "Upload Failed", description: "Could not upload the sponsor logo.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleAddNewHostSchool = () => {
    if (!newHostSchoolName.trim()) return;
    const name = newHostSchoolName.trim();
    if (!schools.includes(name)) setSchools((prev) => [...prev, name].sort());
    form.setValue("host_school", name);
    setNewHostSchoolName(""); setShowAddHostSchool(false); setHostSchoolOpen(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("tournaments").insert({
        name: values.name,
        host_school: values.host_school,
        venue: values.venue,
        province: values.province || null,
        format_notes: values.format_notes || null,
        sponsor_name: values.sponsor_name || null,
        sponsor_logo_url: sponsorLogoUrl || null,
      });
      if (error) throw error;
      toast({ title: "Success", description: "Tournament created successfully" });
      form.reset(); setSponsorLogoUrl("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({ title: "Creation Failed", description: "Could not create the tournament.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Tournament</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tournament Name</FormLabel>
                  <FormControl><Input placeholder="Kearsney Easter Rugby Festival" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="host_school" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Host School / Organizer</FormLabel>
                  <Popover open={hostSchoolOpen} onOpenChange={setHostSchoolOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                          {field.value || "Select host school..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 z-[100]" align="start">
                      <Command>
                        <CommandInput placeholder="Search schools..." value={hostSchoolSearch} onValueChange={setHostSchoolSearch} />
                        <CommandList>
                          <CommandEmpty>
                            <div className="p-2">
                              <p className="text-sm text-muted-foreground mb-2">No school found.</p>
                              {!showAddHostSchool && (
                                <Button type="button" variant="outline" size="sm" onClick={() => { setShowAddHostSchool(true); setNewHostSchoolName(hostSchoolSearch); }} className="w-full gap-1">
                                  <Plus className="h-4 w-4" /> Add "{hostSchoolSearch}"
                                </Button>
                              )}
                            </div>
                          </CommandEmpty>
                          <CommandGroup className="max-h-60 overflow-auto">
                            {filteredHostSchools.map((school) => (
                              <CommandItem key={school} value={school} onSelect={() => { field.onChange(school); setHostSchoolOpen(false); setHostSchoolSearch(""); }}>
                                <Check className={cn("mr-2 h-4 w-4", field.value === school ? "opacity-100" : "opacity-0")} />
                                {school}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <div className="border-t border-border p-2">
                            {!showAddHostSchool ? (
                              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddHostSchool(true)} className="w-full gap-1 justify-start">
                                <Plus className="h-4 w-4" /> Add New School
                              </Button>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <Input placeholder="Enter new school name..." value={newHostSchoolName} onChange={(e) => setNewHostSchoolName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNewHostSchool(); } }} autoFocus />
                                <div className="flex gap-2">
                                  <Button type="button" size="sm" onClick={handleAddNewHostSchool} disabled={!newHostSchoolName.trim()} className="flex-1">Add & Select</Button>
                                  <Button type="button" variant="outline" size="sm" onClick={() => { setShowAddHostSchool(false); setNewHostSchoolName(""); }}>Cancel</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="venue" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue</FormLabel>
                    <FormControl><Input placeholder="Balgowan" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="province" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Province</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger></FormControl>
                      <SelectContent className="z-[100]">
                        {saProvinces.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="format_notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Format Notes (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Non-competitive ethos, Multi-sport, etc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-sm font-medium">Sponsorship Information</h3>
                <FormField control={form.control} name="sponsor_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sponsor Name (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., FNB, Investec" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="space-y-2">
                  <FormLabel>Sponsor Logo (Optional)</FormLabel>
                  <div className="flex items-center gap-4">
                    <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                    {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
                  </div>
                  {sponsorLogoUrl && (
                    <img src={sponsorLogoUrl} alt="Sponsor logo preview" className="h-16 object-contain rounded border border-border p-2 mt-2" />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Tournament"}</Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
