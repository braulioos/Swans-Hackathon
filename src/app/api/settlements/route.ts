import { getCaseDigest } from "@/lib/data";
import { getSettlement, recordSettlement, removeSettlement } from "@/lib/settlement";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const matterId = new URL(request.url).searchParams.get("matterId") ?? "";
  return Response.json({ settlement: await getSettlement(matterId) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const digest = await getCaseDigest(String(body.matterId ?? ""));
    if (!digest) return Response.json({ error: "Unknown matter" }, { status: 404 });
    if (body.verified !== true) return Response.json({ error: "Confirm that the settlement details were checked against the case source." }, { status: 400 });
    const amount = Number(body.amount);
    const settlement = await recordSettlement(digest, { amountCents: Math.round(amount * 100), settledOn: String(body.settledOn ?? ""), sourceNote: String(body.sourceNote ?? ""), showAmountToProvider: body.showAmountToProvider === true });
    return Response.json({ settlement, providerCount: digest.providers.length });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not record settlement." }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  const matterId = new URL(request.url).searchParams.get("matterId") ?? "";
  const digest = await getCaseDigest(matterId);
  if (!digest || !(await getSettlement(matterId))) return Response.json({ error: "Settlement not found" }, { status: 404 });
  await removeSettlement(matterId);
  return Response.json({ ok: true });
}
