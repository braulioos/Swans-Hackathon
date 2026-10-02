import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Step 1 of Clio OAuth (authorization code flow). Verify URLs against Clio's developer docs.
export async function GET(request: Request) {
  const redirectUri = process.env.CLIO_REDIRECT_URI ?? "";

  // The state cookie must be set on the same host Clio redirects back to (localhost and 127.0.0.1 are
  // different cookie jars), so bounce to the redirect URI's host first. request.url is normalized by
  // Next, so compare the Host header the browser actually sent.
  const callback = redirectUri ? new URL(redirectUri) : null;
  if (callback && request.headers.get("host") !== callback.host) {
    redirect(`${callback.origin}/auth/clio/login`);
  }

  const state = crypto.randomUUID();
  (await cookies()).set("clio_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.CLIO_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    state,
  });
  redirect(`${process.env.CLIO_BASE_URL ?? "https://app.clio.com"}/oauth/authorize?${params}`);
}
