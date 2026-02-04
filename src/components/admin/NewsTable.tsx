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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateNewsDialog } from "./CreateNewsDialog";
import { EditNewsDialog } from "./EditNewsDialog";
import { format } from "date-fns";

interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  display_order: number;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export function NewsTable() {
  const { toast } = useToast();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const fetchArticles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("news_articles")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching news:", error);
      toast({
        title: "Failed to Load News",
        description: "Could not retrieve news articles. Please try again.",
        variant: "destructive",
      });
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("news_articles").delete().eq("id", id);
    
    if (error) {
      toast({
        title: "Delete Failed",
        description: "Could not remove the article. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Article has been removed",
      });
      fetchArticles();
    }
  };

  const handleEdit = (article: NewsArticle) => {
    setSelectedArticle(article);
    setEditDialogOpen(true);
  };

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Article
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredArticles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No news articles found
                </TableCell>
              </TableRow>
            ) : (
              filteredArticles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {article.image_url && (
                        <img 
                          src={article.image_url} 
                          alt=""
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <span className="font-medium max-w-[200px] truncate">
                        {article.title}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <span className="text-sm text-muted-foreground truncate block">
                      {article.summary || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={article.is_active ? "default" : "secondary"}>
                      {article.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {article.starts_at || article.expires_at ? (
                      <div className="space-y-0.5">
                        {article.starts_at && (
                          <div>From: {format(new Date(article.starts_at), "MMM d")}</div>
                        )}
                        {article.expires_at && (
                          <div>Until: {format(new Date(article.expires_at), "MMM d")}</div>
                        )}
                      </div>
                    ) : (
                      "Always"
                    )}
                  </TableCell>
                  <TableCell className="text-center">{article.display_order}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {article.link_url && (
                          <DropdownMenuItem onClick={() => window.open(article.link_url!, "_blank")}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Link
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleEdit(article)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(article.id)}
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

      <CreateNewsDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchArticles}
      />

      <EditNewsDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        article={selectedArticle}
        onSuccess={fetchArticles}
      />
    </div>
  );
}
