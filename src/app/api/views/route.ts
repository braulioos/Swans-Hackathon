import { recordMatterView } from "@/lib/data";

// Marks "now" as the user's last visit to a matter, so the next visit's recap shows only what's new.
export async function POST(request: Request) {
  const { matterId } = (await request.json()) as { matterId?: string };
  if (!matterId) return new Response("matterId required", { status: 400 });
  await recordMatterView(matterId);
  return new Response(null, { status: 204 });
}
