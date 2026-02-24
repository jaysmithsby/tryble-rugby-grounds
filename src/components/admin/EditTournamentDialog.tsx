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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(1, "Tournament name is required"),
  host_school: z.string().min(1, "Host school is required"),
  venue: z.string().min(1, "Venue is required"),
  province: z.string().optional(),
  format_notes: z.string().optional(),
  sponsor_name: z.string().optional(),
});

interface EditTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: any;
  onSuccess?: () => void;
}

export function EditTournamentDialog({ open, onOpenChange, tournament, onSuccess }: EditTournamentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState<string>("");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", host_school: "", venue: "", province: "", format_notes: "", sponsor_name: "" },
  });

  useEffect(() => {
    if (open && tournament) {
      setSponsorLogoUrl(tournament.sponsor_logo_url || "");
      form.reset({
        name: tournament.name || "",
        host_school: tournament.host_school || "",
        venue: tournament.venue || "",
        province: tournament.province || "",
        format_notes: tournament.format_notes || "",
        sponsor_name: tournament.sponsor_name || "",
      });
    }
  }, [open, tournament, form]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("tournament-sponsors").upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("tournament-sponsors").getPublicUrl(fileName);
      setSponsorLogoUrl(publicUrl);
    } catch { toast({ title: "Upload Failed", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!tournament?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("tournaments").update({
        name: values.name,
        host_school: values.host_school,
        venue: values.venue,
        province: values.province || null,
        format_notes: values.format_notes || null,
        sponsor_name: values.sponsor_name || null,
        sponsor_logo_url: sponsorLogoUrl || null,
      }).eq("id", tournament.id);
      if (error) throw error;
      toast({ title: "Success", description: "Tournament updated" });
      onOpenChange(false);
      onSuccess?.();
    } catch { toast({ title: "Update Failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader><DialogTitle>Edit Tournament</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Tournament Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="host_school" render={({ field }) => (
                <FormItem><FormLabel>Host School / Organizer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="venue" render={({ field }) => (
                  <FormItem><FormLabel>Venue</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="province" render={({ field }) => (
                  <FormItem><FormLabel>Province</FormLabel><FormControl><Input placeholder="KwaZulu-Natal" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="format_notes" render={({ field }) => (
                <FormItem><FormLabel>Format Notes (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-sm font-medium">Sponsorship</h3>
                <FormField control={form.control} name="sponsor_name" render={({ field }) => (
                  <FormItem><FormLabel>Sponsor Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="space-y-2">
                  <FormLabel>Sponsor Logo</FormLabel>
                  <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                  {sponsorLogoUrl && <img src={sponsorLogoUrl} alt="Logo" className="h-16 object-contain rounded border border-border p-2 mt-2" />}
                </div>
              </div>
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
