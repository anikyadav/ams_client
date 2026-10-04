export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/40 p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-primary/10 to-transparent"
      />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
