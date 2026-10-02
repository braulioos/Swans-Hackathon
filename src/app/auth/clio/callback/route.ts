import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { exchangeToken, saveTokens } from "@/lib/clio-auth";

// Step 2 of Clio OAuth: exchange the code for tokens and store them server-side.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) return new Response(`Clio sign-in was cancelled or failed: ${error}`, { status: 400 });

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  if (!code || !state || state !== jar.get("clio_oauth_state")?.value) {
    return new Response("Invalid OAuth state. Open the app at the same host as CLIO_REDIRECT_URI and try again.", { status: 400 });
  }
  jar.delete("clio_oauth_state");

  try {
    await saveTokens(
      await exchangeToken({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.CLIO_REDIRECT_URI ?? "",
      }),
    );
  } catch (e) {
    return new Response(String(e), { status: 502 });
  }
  redirect("/firm?connected=1");
}
