import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getAuthUser } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth/messages";
import { isAuthConfigured, safeNextPath } from "@/lib/supabase/config";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Sign up",
  path: "/signup",
  description: "Create an account with email and password.",
  noIndex: true,
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  const user = await getAuthUser();
  if (user) redirect(next);
  return (
    <>
      {sp.error ? (
        <p className="mx-auto max-w-md px-4 pt-8 text-sm text-danger" role="alert">
          {authErrorMessage(sp.error)}
        </p>
      ) : null}
      <AuthForm
        mode="signup"
        next={next}
        authReady={isAuthConfigured()}
        initialError={authErrorMessage(sp.error)}
      />
    </>
  );
}
