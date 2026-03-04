"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GitBranch, Copy, Check, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";

interface GitHubIntegrationPanelProps {
  monitorId: string;
  baseUrl: string;
  initialRepo: string | null;
  initialBranch: string | null;
}

export function GitHubIntegrationPanel({
  monitorId,
  baseUrl,
  initialRepo,
  initialBranch,
}: GitHubIntegrationPanelProps) {
  const [open, setOpen] = useState(false);
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const [repo, setRepo] = useState(initialRepo ?? "");
  const [branch, setBranch] = useState(initialBranch ?? "main");

  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const router = useRouter();

  const webhookUrl = `${baseUrl}/api/webhooks/github/${monitorId}`;

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/monitors/${monitorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubRepo: repo || null,
          githubBranch: branch || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save");
      }
      toast.success("GitHub integration saved");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateSecret() {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/monitors/${monitorId}/webhook-secret`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to generate secret");
      }
      const data = (await res.json()) as { secret: string };
      setNewSecret(data.secret);
      setSecretCopied(false);
      setSecretDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate secret",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function copyToClipboard(text: string, onCopied: () => void) {
    navigator.clipboard.writeText(text).then(() => {
      onCopied();
      setTimeout(onCopied, 2000);
    });
  }

  function handleSecretConfirm() {
    setSecretDialogOpen(false);
    setNewSecret(null);
    router.refresh();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1.5" title="GitHub integration">
            <GitBranch className="size-3.5" />
            Webhook
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="size-5 text-secondary" />
              GitHub Deployment Integration
            </DialogTitle>
            <DialogDescription>
              Automatically trigger a performance audit whenever a successful
              deployment lands.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            {/* Compatibility callout */}
            <div className="flex items-start gap-3 rounded-lg border border-border/60 border-l-4 border-l-secondary bg-muted/50 p-3">
              <Info className="size-4 shrink-0 text-muted-foreground mt-0.5" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Works automatically with{" "}
                <span className="font-medium text-foreground">Vercel</span>,{" "}
                <span className="font-medium text-foreground">Netlify</span>,{" "}
                <span className="font-medium text-foreground">Render</span>, and{" "}
                <span className="font-medium text-foreground">
                  GitHub Actions
                </span>{" "}
                that emit{" "}
                <code className="font-mono text-xs">deployment_status</code>{" "}
                events.
              </p>
            </div>

            {/* Webhook URL */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() =>
                    copyToClipboard(webhookUrl, () => setUrlCopied(true))
                  }
                  title="Copy webhook URL"
                >
                  {urlCopied ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Webhook secret rotation */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Webhook Secret</Label>
              <div className="flex gap-2">
                <Input
                  value="••••••••••••••••••••••••••••••••"
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleGenerateSecret}
                  disabled={isGenerating}
                  title="Rotate secret"
                >
                  <RefreshCw
                    className={`size-4 ${isGenerating ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Rotating generates a new secret — update GitHub immediately
                after.
              </p>
            </div>

            {/* Repo field */}
            <div className="grid gap-2">
              <Label htmlFor="github-repo" className="text-sm font-medium">
                Repository{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="github-repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="owner/repo"
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                For display only — not used in webhook matching.
              </p>
            </div>

            {/* Branch field */}
            <div className="grid gap-2">
              <Label htmlFor="github-branch" className="text-sm font-medium">
                Branch
              </Label>
              <Input
                id="github-branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="font-mono text-xs"
              />
            </div>

            {/* Setup instructions */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold text-foreground mb-2 tracking-tight uppercase">
                Setup Instructions
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground leading-relaxed">
                <li>
                  Go to your GitHub repo → Settings → Webhooks → Add webhook
                </li>
                <li>Paste the Webhook URL above into the Payload URL field</li>
                <li>
                  Set Content type to{" "}
                  <code className="font-mono">application/json</code>
                </li>
                <li>Paste the secret into the Secret field</li>
                <li>
                  Under &ldquo;Which events?&rdquo;, select{" "}
                  <em>Let me select individual events</em> and check{" "}
                  <strong>Deployment statuses</strong>
                </li>
                <li>Save and verify the green checkmark appears</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="text"
              type="button"
              disabled={isSaving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-time secret reveal dialog */}
      <AlertDialog open={secretDialogOpen} onOpenChange={setSecretDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy your new webhook secret</AlertDialogTitle>
            <AlertDialogDescription>
              This secret will not be shown again. Copy it now and paste it into
              GitHub Webhooks → Secret.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 my-2">
            <Input
              value={newSecret ?? ""}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() =>
                copyToClipboard(newSecret ?? "", () => setSecretCopied(true))
              }
              title="Copy secret"
            >
              {secretCopied ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          <AlertDialogFooter>
            <Button onClick={handleSecretConfirm} className="w-full">
              I&apos;ve saved this secret
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
