import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { LogOut } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              Absensi &amp; Penggajian
            </p>
            <p className="truncate text-xs text-muted">{session.user.name}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted hover:bg-primary-soft hover:text-primary"
              aria-label="Keluar"
            >
              <LogOut className="size-4" />
              Keluar
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-24 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
