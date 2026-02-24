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
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(1, "Tournament name is required"),
});

interface EditTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: any;
  onSuccess?: () => void;
}

export function EditTournamentDialog({ open, onOpenChange, tournament, onSuccess }: EditTournamentDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (open && tournament) {
      form.reset({ name: tournament.name || "" });
    }
  }, [open, tournament, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!tournament?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("tournaments").update({
        name: values.name,
      } as any).eq("id", tournament.id);
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
              <p className="text-xs text-muted-foreground">Host school, venue, sponsors and other details are set per edition.</p>
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
