import { type FormEvent, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";

// ---------------------------------------------------------------------------
// Simple confirm dialog (title + optional description + cancel/confirm)
// ---------------------------------------------------------------------------

export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  isSubmitting,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}) => (
  <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} disabled={isSubmitting}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ---------------------------------------------------------------------------
// Form dialog (title + optional description + form body + cancel/submit)
// ---------------------------------------------------------------------------

export const FormDialog = ({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  title,
  description,
  confirmLabel = "Submit",
  cancelLabel = "Cancel",
  children,
  errorMessage,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  children: ReactNode;
  errorMessage?: string | null;
}) => (
  <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-3 mt-2">
        {children}
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? `${confirmLabel}…` : confirmLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);
