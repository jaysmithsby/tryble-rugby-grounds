import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Users, Award, Flag } from "lucide-react";
import { format } from "date-fns";

interface UserActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export function UserActivityDialog({ open, onOpenChange, user }: UserActivityDialogProps) {
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<any>(null);

  useEffect(() => {
    if (open) {
      fetchActivity();
    }
  }, [open, user.id]);

  const fetchActivity = async () => {
    try {
      setLoading(true);

      // Fetch predictions with fixture info (replaces user_scores)
      const { data: predictions } = await supabase
        .from('predictions')
        .select(`
          id,
          points_earned,
          predicted_margin,
          created_at,
          fixtures!inner(match_date, year, school_a_id, school_b_id, score_a, score_b, status)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Aggregate predictions stats
      const totalPredictions = predictions?.length || 0;
      const correctPredictions = predictions?.filter(p => (p.points_earned || 0) >= 4).length || 0;
      const totalBrags = predictions?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0;
      const accuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;

      // Fetch pools
      const { data: pools } = await supabase
        .from('pool_members')
        .select(`
          *,
          pools:pool_id (
            id,
            name,
            created_at
          )
        `)
        .eq('user_id', user.id);

      // Fetch badges
      const { data: badges } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      // Fetch sanctions history
      const { data: sanctions } = await supabase
        .from('user_sanctions')
        .select('*')
        .eq('user_id', user.id)
        .order('sanctioned_at', { ascending: false });

      // Fetch reports
      const { data: reports } = await supabase
        .from('user_reports')
        .select('*')
        .eq('reported_user_id', user.id)
        .order('created_at', { ascending: false });

      setActivityData({
        predictions,
        totalPredictions,
        correctPredictions,
        totalBrags,
        accuracy,
        pools: pools?.map(p => p.pools).filter(Boolean),
        badges,
        sanctions,
        reports,
      });
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Activity Summary</DialogTitle>
          <DialogDescription>
            Detailed activity history for {user.profile?.display_name || user.email}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="gameplay" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="gameplay">
                <TrendingUp className="h-4 w-4 mr-2" />
                Gameplay
              </TabsTrigger>
              <TabsTrigger value="pools">
                <Users className="h-4 w-4 mr-2" />
                Pools
              </TabsTrigger>
              <TabsTrigger value="badges">
                <Award className="h-4 w-4 mr-2" />
                Badges
              </TabsTrigger>
              <TabsTrigger value="moderation">
                <Flag className="h-4 w-4 mr-2" />
                Moderation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gameplay" className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-bold">
                    {activityData.totalPredictions}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Picks</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {activityData.correctPredictions}
                  </div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-bold">
                    {activityData.accuracy}%
                  </div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-bold text-primary">
                    {activityData.totalBrags}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Brags</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Recent Predictions</h4>
                <div className="space-y-2">
                  {activityData.predictions?.slice(0, 10).map((pred: any) => (
                    <div key={pred.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(pred.created_at), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <Badge variant={pred.points_earned >= 4 ? "default" : "secondary"}>
                        {pred.points_earned ?? '—'} brags
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pools" className="space-y-4">
              {activityData.pools?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pools joined yet
                </div>
              ) : (
                <div className="space-y-2">
                  {activityData.pools?.map((pool: any) => (
                    <div key={pool.id} className="p-4 rounded-lg border">
                      <div className="font-medium">{pool.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Joined {format(new Date(pool.created_at), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="badges" className="space-y-4">
              {activityData.badges?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No badges earned yet
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {activityData.badges?.map((badge: any) => (
                    <div key={badge.id} className="p-4 rounded-lg border">
                      <Badge className="mb-2">{badge.badge_type}</Badge>
                      <div className="text-sm text-muted-foreground">
                        {badge.week_number && `Week ${badge.week_number} • `}
                        {format(new Date(badge.earned_at), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="moderation" className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Sanctions History</h4>
                {activityData.sanctions?.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No sanctions on record
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activityData.sanctions?.map((sanction: any) => (
                      <div key={sanction.id} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={sanction.is_active ? "destructive" : "secondary"}>
                            {sanction.sanction_type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(sanction.sanctioned_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <div className="text-sm">{sanction.reason}</div>
                        {sanction.expires_at && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Expires: {format(new Date(sanction.expires_at), 'MMM dd, yyyy')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2">Reports</h4>
                {activityData.reports?.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No reports filed
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activityData.reports?.map((report: any) => (
                      <div key={report.id} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <Badge>{report.status}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(report.created_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <div className="text-sm font-medium">{report.report_reason}</div>
                        {report.report_details && (
                          <div className="text-sm text-muted-foreground mt-1">{report.report_details}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
