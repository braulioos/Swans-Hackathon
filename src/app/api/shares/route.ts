import crypto from "node:crypto";
import { db } from "@/lib/db";
import type { ShareConfig } from "@/lib/types";

// Saves what the attorney chose to share and returns an unguessable link token.
export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ShareConfig>;
  if (!body.matterId || !body.providerId || !body.sections) return new Response("matterId, providerId and sections required", { status: 400 });

  const token = crypto.randomBytes(18).toString("base64url");
  const config = {
    providerId: body.providerId,
    sections: body.sections,
    coverageDetail: body.coverageDetail ?? "yesNo",
    hiddenEventIds: body.hiddenEventIds ?? [],
    noteToProvider: body.noteToProvider ?? "",
  };
  await db.prepare("INSERT INTO shares (token, matter_id, config, created_at) VALUES (?, ?, ?, ?)").run(
    token,
    String(body.matterId),
    JSON.stringify(config),
    new Date().toISOString(),
  );
  return Response.json({ token });
}
