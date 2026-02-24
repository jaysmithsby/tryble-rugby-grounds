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
import { Switch } from "@/components/ui/switch";
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

interface EditEditionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edition: any;
  tournamentName?: string;
  onSuccess?: () => void;
}

export function EditEditionDialog({ open, onOpenChange, edition, tournamentName, onSuccess }: EditEditionDialogProps) {
  const [schools, setSchools] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { year: new Date().getFullYear(), start_date: "", end_date: "", participating_schools: [], is_active: true },
  });

  useEffect(() => {
    if (open && edition) {
      fetchSchools();
      form.reset({
        year: edition.year,
        start_date: new Date(edition.start_date).toISOString().slice(0, 16),
        end_date: new Date(edition.end_date).toISOString().slice(0, 16),
        participating_schools: edition.participating_schools || [],
        is_active: edition.is_active ?? true,
      });
    }
  }, [open, edition]);

  const fetchSchools = async () => {
    const { data } = await supabase.from("schools").select("name").order("name");
    setSchools(data?.map((s) => s.name) || []);
  };

  const filteredSchools = useMemo(() => {
    if (!searchQuery) return schools;
    return schools.filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [schools, searchQuery]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!edition?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("tournament_editions" as any).update({
        year: values.year,
        start_date: values.start_date,
        end_date: values.end_date,
        participating_schools: values.participating_schools,
        is_active: values.is_active,
      }).eq("id", edition.id);
      if (error) throw error;
      toast({ title: "Success", description: "Edition updated" });
      onOpenChange(false);
      onSuccess?.();
    } catch { toast({ title: "Update Failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Edition — {tournamentName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="year" render={({ field }) => (
                <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="start_date" render={({ field }) => (
                  <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="end_date" render={({ field }) => (
                  <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
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
                          <button type="button" onClick={() => field.onChange(field.value.filter((x) => x !== s))} className="ml-1 rounded-full hover:bg-muted p-0.5"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Input placeholder="Search schools..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <ScrollArea className="h-48 border border-border rounded-md p-4 bg-background">
                    <div className="space-y-2">
                      {filteredSchools.map((school) => (
                        <div key={school} className="flex items-center space-x-2">
                          <Checkbox checked={field.value.includes(school)} onCheckedChange={(checked) => { if (checked) field.onChange([...field.value, school]); else field.onChange(field.value.filter((s) => s !== school)); }} />
                          <label className="text-sm cursor-pointer">{school}</label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">{field.value.length} school(s) selected</p>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div><FormLabel>Active Status</FormLabel><p className="text-xs text-muted-foreground">Set edition visibility</p></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
