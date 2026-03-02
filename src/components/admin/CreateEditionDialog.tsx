import { useState, useEffect } from "react";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { saProvinces } from "@/data/saProvinces";

const formSchema = z.object({
  year: z.coerce.number().min(2000).max(2100),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  host_school: z.string().optional(),
  venue: z.string().optional(),
  province: z.string().optional(),
  format_notes: z.string().optional(),
  sponsor_name: z.string().optional(),
  is_active: z.boolean().default(true),
});

interface CreateEditionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: { id: string; name: string } | null;
  onSuccess?: () => void;
}

export function CreateEditionDialog({ open, onOpenChange, tournament, onSuccess }: CreateEditionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      start_date: "", end_date: "",
      host_school: "", venue: "", province: "", format_notes: "", sponsor_name: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        year: new Date().getFullYear(), start_date: "", end_date: "",
        host_school: "", venue: "", province: "", format_notes: "", sponsor_name: "",
        is_active: true,
      });
      setSponsorLogoUrl(""); setLogoUrl("");
    }
  }, [open]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, bucket: string, setter: (url: string) => void) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from(bucket).upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      setter(publicUrl);
    } catch {
      toast({ title: "Upload Failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!tournament) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("tournament_editions" as any).insert({
        tournament_id: tournament.id,
        year: values.year,
        start_date: values.start_date,
        end_date: values.end_date,
        host_school: values.host_school || null,
        venue: values.venue || null,
        province: values.province || null,
        format_notes: values.format_notes || null,
        sponsor_name: values.sponsor_name || null,
        sponsor_logo_url: sponsorLogoUrl || null,
        logo_url: logoUrl || null,
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

              <FormField control={form.control} name="host_school" render={({ field }) => (
                <FormItem>
                  <FormLabel>Host School / Organizer</FormLabel>
                  <FormControl><Input placeholder="e.g. Kearsney College" {...field} /></FormControl>
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
                  <FormControl><Textarea placeholder="Non-competitive ethos, etc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-sm font-medium">Sponsorship & Branding</h3>
                <FormField control={form.control} name="sponsor_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sponsor Name (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., FNB" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="space-y-2">
                  <FormLabel>Sponsor Logo (Optional)</FormLabel>
                  <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "tournament-sponsors", setSponsorLogoUrl)} disabled={uploading} />
                  {sponsorLogoUrl && <img src={sponsorLogoUrl} alt="Sponsor" className="h-12 object-contain rounded border border-border p-1 mt-1" />}
                </div>
                <div className="space-y-2">
                  <FormLabel>Tournament Logo (Optional)</FormLabel>
                  <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "tournament-sponsors", setLogoUrl)} disabled={uploading} />
                  {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 object-contain rounded border border-border p-1 mt-1" />}
                </div>
              </div>

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
