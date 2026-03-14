import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Star, UserMinus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PoolMember {
  user_id: string;
  joined_at: string | null;
  display_name: string | null;
  school_name: string | null;
}

interface PoolMembersListProps {
  members: PoolMember[];
  creatorId: string;
  currentUserId: string | null;
  onMemberRemoved: () => void;
  poolId: string;
}

export const PoolMembersList = ({
  members,
  creatorId,
  currentUserId,
  isEditable,
  onMemberRemoved,
  poolId,
}: PoolMembersListProps) => {
  const { toast } = useToast();
  const [removingMember, setRemovingMember] = useState<PoolMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const isAdmin = currentUserId === creatorId;

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getSchoolCode = (schoolName: string | null) => {
    if (!schoolName) return "";
    const words = schoolName.split(" ");
    if (words.length === 1) return schoolName.substring(0, 3).toUpperCase();
    return words
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  };

  const handleRemoveMember = async () => {
    if (!removingMember) return;

    setIsRemoving(true);
    try {
      const { error } = await supabase
        .from("pool_members")
        .delete()
        .eq("pool_id", poolId)
        .eq("user_id", removingMember.user_id);

      if (error) throw error;

      toast({
        title: "Member removed",
        description: `${removingMember.display_name || "Member"} has been removed from the pool.`,
      });

      onMemberRemoved();
    } catch (error: any) {
      toast({
        title: "Error removing member",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
      setRemovingMember(null);
    }
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground text-sm">No members yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {members.map((member) => {
          const isCreator = member.user_id === creatorId;
          const isSelf = member.user_id === currentUserId;
          const canRemove = isAdmin && isEditable && !isCreator && !isSelf;

          return (
            <div
              key={member.user_id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(member.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {member.display_name || "Anonymous"}
                    </span>
                    {isCreator && (
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    )}
                    {isSelf && (
                      <Badge variant="secondary" className="text-xs h-5">
                        You
                      </Badge>
                    )}
                  </div>
                  {member.school_name && (
                    <span className="text-xs text-muted-foreground">
                      {getSchoolCode(member.school_name)}
                    </span>
                  )}
                </div>
              </div>

              {canRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setRemovingMember(member)}
                >
                  <UserMinus className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{removingMember?.display_name || "this member"}</strong> from
              the pool? They can rejoin using the invite code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
