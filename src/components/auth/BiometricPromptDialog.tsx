import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Fingerprint } from "lucide-react";

interface BiometricPromptDialogProps {
  open: boolean;
  onEnable: () => void;
  onSkip: () => void;
}

const BiometricPromptDialog = ({ open, onEnable, onSkip }: BiometricPromptDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-4">
              <Fingerprint className="h-10 w-10 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center">
            Enable Biometric Login?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Use Face ID or fingerprint to sign in instantly next time. Your
            credentials will be stored securely on your device.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction onClick={onEnable} className="w-full">
            Enable
          </AlertDialogAction>
          <AlertDialogCancel onClick={onSkip} className="w-full mt-0">
            Not Now
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BiometricPromptDialog;
