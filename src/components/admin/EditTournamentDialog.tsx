import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(1, "Tournament name is required"),
  host_school: z.string().min(1, "Host school is required"),
  venue: z.string().min(1, "Venue is required"),
  province: z.string().optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  format_notes: z.string().optional(),
  participating_schools: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

interface EditTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: any;
}

export function EditTournamentDialog({
  open,
  onOpenChange,
  tournament,
}: EditTournamentDialogProps) {
  const [schools, setSchools] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      host_school: "",
      venue: "",
      province: "",
      start_date: "",
      end_date: "",
      format_notes: "",
      participating_schools: [],
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && tournament) {
      fetchSchools();
      form.reset({
        name: tournament.name || "",
        host_school: tournament.host_school || "",
        venue: tournament.venue || "",
        province: tournament.province || "",
        start_date: tournament.start_date
          ? new Date(tournament.start_date).toISOString().slice(0, 16)
          : "",
        end_date: tournament.end_date
          ? new Date(tournament.end_date).toISOString().slice(0, 16)
          : "",
        format_notes: tournament.format_notes || "",
        participating_schools: tournament.participating_schools || [],
        is_active: tournament.is_active ?? true,
      });
    }
  }, [open, tournament, form]);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("name")
        .order("name");

      if (error) throw error;
      setSchools(data?.map((s) => s.name) || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!tournament?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("tournaments")
        .update({
          name: values.name,
          host_school: values.host_school,
          venue: values.venue,
          province: values.province || null,
          start_date: values.start_date,
          end_date: values.end_date,
          format_notes: values.format_notes || null,
          participating_schools: values.participating_schools,
          is_active: values.is_active,
        })
        .eq("id", tournament.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tournament updated successfully",
      });

      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      console.error("Error updating tournament:", error);
      toast({
        title: "Error",
        description: "Failed to update tournament",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Tournament</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Kearsney Easter Rugby Festival" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="host_school"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Host School / Organizer</FormLabel>
                    <FormControl>
                      <Input placeholder="St John's College" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="venue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue</FormLabel>
                      <FormControl>
                        <Input placeholder="Balgowan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Province</FormLabel>
                      <FormControl>
                        <Input placeholder="KwaZulu-Natal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="format_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Non-competitive ethos, Multi-sport, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="participating_schools"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Participating Schools</FormLabel>
                    <ScrollArea className="h-48 border border-border rounded-md p-4">
                      <div className="space-y-2">
                        {schools.map((school) => (
                          <div key={school} className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value?.includes(school)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, school]);
                                } else {
                                  field.onChange(
                                    current.filter((s) => s !== school)
                                  );
                                }
                              }}
                            />
                            <label className="text-sm cursor-pointer">{school}</label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground">
                      {field.value?.length || 0} school(s) selected
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <FormLabel>Active Status</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Set tournament visibility
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
