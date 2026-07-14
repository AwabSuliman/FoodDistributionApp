import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, getSupabaseConfig, safeRedirectPath } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));
  const redirectUrl = new URL(requestUrl);

  redirectUrl.pathname = next;
  redirectUrl.search = "";

  if (!getSupabaseConfig()) {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", next);
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(redirectUrl);
    }
  }

  redirectUrl.pathname = "/login";
  redirectUrl.searchParams.set("next", next);
  redirectUrl.searchParams.set("error", "Unable to confirm your sign-in link. Please try again.");
  return NextResponse.redirect(redirectUrl);
}
