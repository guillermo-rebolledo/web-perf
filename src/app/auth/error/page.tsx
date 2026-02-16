export default function ErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-card p-8 shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            There was a problem signing you in. Please try again.
          </p>
        </div>
      </div>
    </div>
  );
}
