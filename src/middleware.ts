import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/session";
import { CSRF_COOKIE_NAME, CSRF_COOKIE_MAX_AGE_SECONDS, generateCsrfToken } from "@/lib/csrf";

const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function ensureCsrfCookieThenContinue(req: NextRequest): NextResponse {
  if (req.cookies.get(CSRF_COOKIE_NAME)?.value) {
    return NextResponse.next();
  }

  // No CSRF cookie yet — set it and redirect back to the same URL. This
  // forces one real browser round-trip, so by the time /login actually
  // renders, the cookie is genuinely present on the *incoming* request and
  // cookies() in the page (a Server Component, which can only read
  // cookies, never set them) sees it correctly. Setting it on a
  // NextResponse.next() response instead would only reach the browser for
  // its *next* navigation — the Server Component rendered as part of that
  // same response would still see an empty cookie jar.
  const response = NextResponse.redirect(req.nextUrl);
  response.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
    httpOnly: false, // must be readable so the login form can echo it back as a hidden field
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CSRF_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    // Already-authenticated users hitting /login get bounced straight to the dashboard.
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySession(token);
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return ensureCsrfCookieThenContinue(req);
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySession(token);
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
