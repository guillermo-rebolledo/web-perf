import { redirect } from "next/navigation";
import { Terminal, AlertTriangle, Clock } from "lucide-react";
import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { CliAuthorizeForm } from "./form";

interface Props {
  searchParams: Promise<{ code?: string }>;
}

// Shared card shell
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg">
        {children}
      </div>
    </div>
  );
}

// Shared page header
function Header() {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Terminal className="size-5" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Performance Lab
        </p>
        <h1 className="text-lg font-semibold leading-none">
          CLI Authorization
        </h1>
      </div>
    </div>
  );
}

export default async function CliAuthorizePage({ searchParams }: Props) {
  const { code } = await searchParams;

  // ── Missing code ────────────────────────────────────────────────────────────
  if (!code) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="size-7 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Invalid request</h2>
            <p className="text-sm text-muted-foreground">
              No authorization code was provided. Start by running{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                side auth
              </code>{" "}
              in your terminal.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // ── Auth guard — preserve code in callback URL ──────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    redirect(
      `/auth/signin?callbackUrl=${encodeURIComponent(`/cli/authorize?code=${code}`)}`,
    );
  }

  // ── Validate code in Redis ──────────────────────────────────────────────────
  const raw = await redis.get(`cli:login:${code}`);

  if (!raw) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/10">
            <Clock className="size-7 text-amber-500" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Code expired</h2>
            <p className="text-sm text-muted-foreground">
              This authorization code has expired or was already used. Run{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                side auth
              </code>{" "}
              again to get a fresh one.
            </p>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Back to dashboard
          </a>
        </div>
      </Card>
    );
  }

  const state = JSON.parse(raw) as { status: string };

  // ── Already authorized (e.g. user refreshed after clicking) ────────────────
  if (state.status === "authorized") {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
            <Terminal className="size-7 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Already authorized</h2>
            <p className="text-sm text-muted-foreground">
              Your CLI is already authenticated. You can close this tab.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // ── Happy path — show the interactive form ──────────────────────────────────
  return (
    <Card>
      <Header />
      <CliAuthorizeForm code={code} email={session.user.email ?? ""} />
    </Card>
  );
}
