import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, ExternalLink, Eye, MousePointerClick } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateAdDialog } from "./CreateAdDialog";
import { EditAdDialog } from "./EditAdDialog";
import { format } from "date-fns";

interface Advertisement {
  id: string;
  campaign_name: string;
  sponsor_name: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  display_order: number;
  starts_at: string | null;
  expires_at: string | null;
  impressions: number;
  clicks: number;
  created_at: string;
}

export function AdsTable() {
  const { toast } = useToast();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);

  const fetchAds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("advertisements")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching ads:", error);
      toast({
        title: "Error",
        description: "Failed to fetch advertisements",
        variant: "destructive",
      });
    } else {
      setAds(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("advertisements").delete().eq("id", id);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete advertisement",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Advertisement has been removed",
      });
      fetchAds();
    }
  };

  const handleEdit = (ad: Advertisement) => {
    setSelectedAd(ad);
    setEditDialogOpen(true);
  };

  const filteredAds = ads.filter(
    (ad) =>
      ad.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ad.sponsor_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCtr = (impressions: number, clicks: number) => {
    if (impressions === 0) return "0%";
    return ((clicks / impressions) * 100).toFixed(2) + "%";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Ad
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Sponsor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  Impressions
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <MousePointerClick className="h-3.5 w-3.5" />
                  Clicks
                </div>
              </TableHead>
              <TableHead className="text-center">CTR</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredAds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No advertisements found
                </TableCell>
              </TableRow>
            ) : (
              filteredAds.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img 
                        src={ad.image_url} 
                        alt={ad.campaign_name}
                        className="w-12 h-8 object-cover rounded"
                      />
                      <span className="font-medium">{ad.campaign_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{ad.sponsor_name}</TableCell>
                  <TableCell>
                    <Badge variant={ad.is_active ? "default" : "secondary"}>
                      {ad.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{ad.impressions.toLocaleString()}</TableCell>
                  <TableCell className="text-center">{ad.clicks.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-medium">
                    {getCtr(ad.impressions, ad.clicks)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ad.starts_at || ad.expires_at ? (
                      <div className="space-y-0.5">
                        {ad.starts_at && <div>From: {format(new Date(ad.starts_at), "MMM d")}</div>}
                        {ad.expires_at && <div>Until: {format(new Date(ad.expires_at), "MMM d")}</div>}
                      </div>
                    ) : (
                      "Always"
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(ad.link_url, "_blank")}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(ad)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(ad.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateAdDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchAds}
      />

      <EditAdDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        ad={selectedAd}
        onSuccess={fetchAds}
      />
    </div>
  );
}
