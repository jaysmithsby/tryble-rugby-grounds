import { useState } from "react";
import { MoreHorizontal, Ban, Clock, Trash2, FileText, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SuspendUserDialog } from "./SuspendUserDialog";
import { BanUserDialog } from "./BanUserDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { UserActivityDialog } from "./UserActivityDialog";

interface UserActionsDropdownProps {
  user: any;
  onUpdate: () => void;
}

export function UserActionsDropdown({ user, onUpdate }: UserActionsDropdownProps) {
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setActivityOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            View Activity Summary
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setSuspendOpen(true)}>
            <Clock className="mr-2 h-4 w-4" />
            Temporary Suspension
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setBanOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Ban className="mr-2 h-4 w-4" />
            Permanent Ban
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SuspendUserDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        user={user}
        onSuccess={onUpdate}
      />

      <BanUserDialog
        open={banOpen}
        onOpenChange={setBanOpen}
        user={user}
        onSuccess={onUpdate}
      />

      <DeleteUserDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        user={user}
        onSuccess={onUpdate}
      />

      <UserActivityDialog
        open={activityOpen}
        onOpenChange={setActivityOpen}
        user={user}
      />
    </>
  );
}