"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function AccountSection() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/user/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "perflabs-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export data. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (res.status === 202) {
        toast.success("Check your email — a confirmation link is on its way.");
      } else if (res.status === 204) {
        await signOut({ callbackUrl: "/" });
      } else {
        throw new Error("Delete failed");
      }
    } catch {
      toast.error("Could not delete account. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Export Data</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download all your sites, monitors, and audit history as JSON.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? "Exporting…" : "Export"}
        </Button>
      </div>

      <Separator className="my-4" />

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Delete Account</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Permanently remove your account and all associated data.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              Delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account, all sites, monitors, and audit history.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive" })}
                onClick={handleDelete}
                disabled={deleting}
              >
                Yes, delete my account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
