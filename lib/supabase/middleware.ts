import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

/** Routes that require an authenticated user. */
const PROTECTED = [/^\/start(\/|$)/, /^\/chat(\/|$)/, /^\/settings(\/|$)/];

export function isProtectedPath(pathname: string) {
  return PROTECTED.some((r) => r.test(pathname));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  if (!supabaseConfigured()) {
    // Dev mode: the lightweight dev cookie stands in for the Supabase session.
    const hasDev = request.cookies.get("hs_dev_uid")?.value;
    if (isProtectedPath(pathname) && !hasDev) {
      return redirectToSignIn(request);
    }
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser() refreshes the session — do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(pathname)) {
    return redirectToSignIn(request);
  }

  return response;
}

function redirectToSignIn(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.hash = "";
  url.searchParams.set("next", request.nextUrl.pathname);
  url.searchParams.set("signin", "1");
  return NextResponse.redirect(url);
}
