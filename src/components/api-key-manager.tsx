"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { parseUserAgent } from "@/lib/parse-user-agent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiKeyItem } from "@/types/api";

interface Props {
  initialKeys: ApiKeyItem[];
}


export function ApiKeyManager({ initialKeys }: Props) {
  const [keys, setKeys] = useState<ApiKeyItem[]>(initialKeys);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create key");
      }

      const data = (await res.json()) as { key: ApiKeyItem; rawKey: string };
      setKeys((prev) => [data.key, ...prev]);
      setNewRawKey(data.rawKey);
      setKeyVisible(false);
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    setRevoking(id);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to revoke key");
      }

      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("API key revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setRevoking(null);
    }
  }

  function copyKey(key: string) {
    void navigator.clipboard
      .writeText(key)
      .then(() => toast.success("Copied to clipboard"));
  }

  const maskedKey = newRawKey
    ? `${newRawKey.slice(0, 13)}${"•".repeat(24)}`
    : "";

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="flex flex-col md:flex-row gap-2"
          >
            <Input
              placeholder="Key name (e.g. CLI on MacBook Pro)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 placeholder:tracking-tighter"
              disabled={creating}
            />
            <Button type="submit" disabled={creating || !name.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              {creating ? "Creating…" : "Generate Key"}
            </Button>
          </form>
        </div>

        {keys.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No API keys yet. Create one above to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>
                    <p className="font-medium">{key.name}</p>
                    {key.userAgent && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {parseUserAgent(key.userAgent)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {key.keyPrefix}…
                    </code>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {key.lastUsedAt
                      ? formatDistanceToNow(new Date(key.lastUsedAt), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {key.expiresAt
                      ? formatDistanceToNow(new Date(key.expiresAt), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={revoking === key.id}
                      onClick={() => void handleRevoke(key.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Revoke</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* One-time key display dialog */}
      <Dialog
        open={newRawKey !== null}
        onOpenChange={(open) => {
          if (!open) {
            setNewRawKey(null);
            setKeyVisible(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your key now — it won&apos;t be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
            <code className="flex-1 break-all text-sm">
              {keyVisible ? newRawKey : maskedKey}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setKeyVisible((v) => !v)}
              aria-label={keyVisible ? "Hide key" : "Reveal key"}
            >
              {keyVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => newRawKey && copyKey(newRawKey)}
              aria-label="Copy key"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Store this securely. You can use it as{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              Authorization: Bearer &lt;key&gt;
            </code>{" "}
            or save it via{" "}
            <code className="rounded bg-muted px-1 py-0.5">side auth</code>.
          </p>

          <Button onClick={() => { setNewRawKey(null); setKeyVisible(false); }} className="w-full">
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
