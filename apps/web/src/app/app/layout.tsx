import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getAuthUser } from "@/lib/auth";
import { isAuthBypassed } from "@/lib/supabase/config";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

// Every workspace route depends on the Supabase session cookie. Keep the
// authenticated shell dynamic so a post-signup redirect cannot hit a route
// that was incorrectly prerendered without request cookies.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: {
  children: React.ReactNode;
}) {
  const user = isAuthBypassed()
    ? { id: "local-bypass", email: "local@bypass.dev" as string | undefined }
    : await getAuthUser();

  if (!isAuthBypassed() && !user) {
    redirect("/login?next=%2Fapp");
  }

  return (
    <AppShell
      initialUser={
        user
          ? { email: user.email ?? null }
          : null
      }
    >
      {children}
    </AppShell>
  );
}
