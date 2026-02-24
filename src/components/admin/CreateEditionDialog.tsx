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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const formSchema = z.object({
  year: z.coerce.number().min(2000).max(2100),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  participating_schools: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

interface CreateEditionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: { id: string; name: string } | null;
  onSuccess?: () => void;
}

export function CreateEditionDialog({ open, onOpenChange, tournament, onSuccess }: CreateEditionDialogProps) {
  const [schools, setSchools] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      start_date: "", end_date: "",
      participating_schools: [], is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      fetchSchools();
      form.reset({ year: new Date().getFullYear(), start_date: "", end_date: "", participating_schools: [], is_active: true });
    }
  }, [open]);

  const fetchSchools = async () => {
    const { data } = await supabase.from("schools").select("name").order("name");
    setSchools(data?.map((s) => s.name) || []);
  };

  const filteredSchools = useMemo(() => {
    if (!searchQuery) return schools;
    return schools.filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [schools, searchQuery]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!tournament) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("tournament_editions" as any).insert({
        tournament_id: tournament.id,
        year: values.year,
        start_date: values.start_date,
        end_date: values.end_date,
        participating_schools: values.participating_schools,
        is_active: values.is_active,
      });
      if (error) throw error;
      toast({ title: "Success", description: `${values.year} edition created for ${tournament.name}` });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      const msg = error.message?.includes("unique") ? "An edition for this year already exists." : "Could not create edition.";
      toast({ title: "Creation Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add Edition — {tournament?.name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="year" render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="start_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="end_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="participating_schools" render={({ field }) => (
                <FormItem>
                  <FormLabel>Participating Schools</FormLabel>
                  {field.value.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {field.value.map((s) => (
                        <Badge key={s} variant="secondary" className="gap-1 pr-1">
                          {s}
                          <button type="button" onClick={() => field.onChange(field.value.filter((x) => x !== s))} className="ml-1 rounded-full hover:bg-muted p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Input placeholder="Search schools..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <ScrollArea className="h-48 border border-border rounded-md p-4 bg-background">
                    <div className="space-y-2">
                      {filteredSchools.map((school) => (
                        <div key={school} className="flex items-center space-x-2">
                          <Checkbox
                            checked={field.value.includes(school)}
                            onCheckedChange={(checked) => {
                              if (checked) field.onChange([...field.value, school]);
                              else field.onChange(field.value.filter((s) => s !== school));
                            }}
                          />
                          <label className="text-sm cursor-pointer">{school}</label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">{field.value.length} school(s) selected</p>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Edition"}</Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
