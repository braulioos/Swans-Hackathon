import "server-only";
import { db } from "@/lib/db";
import type { CaseDigest } from "@/lib/types";
import { invalidateLocalCache } from "@/lib/local-cache";

export type Settlement = {
  matterId: string;
  amountCents: number;
  settledOn: string;
  sourceNote: string;
  showAmountToProvider: boolean;
  firmNotice: string;
  providerNotice: string;
  updatedAt: string;
};

type Row = { matter_id: string; amount_cents: number; settled_on: string; source_note: string; show_amount_to_provider: number; firm_notice: string; provider_notice: string; updated_at: string };

export async function getSettlement(matterId: string): Promise<Settlement | null> {
  const row = await db.prepare("SELECT * FROM case_settlements WHERE matter_id = ?").get(matterId) as Row | undefined;
  return row ? { matterId: row.matter_id, amountCents: row.amount_cents, settledOn: row.settled_on, sourceNote: row.source_note, showAmountToProvider: !!row.show_amount_to_provider, firmNotice: row.firm_notice, providerNotice: row.provider_notice, updatedAt: row.updated_at } : null;
}

export async function recordSettlement(digest: CaseDigest, input: { amountCents: number; settledOn: string; sourceNote: string; showAmountToProvider: boolean }): Promise<Settlement> {
  const { amountCents, settledOn, sourceNote, showAmountToProvider } = input;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 100_000_000_000) throw new Error("Enter a valid settlement amount.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(settledOn) || Number.isNaN(Date.parse(`${settledOn}T00:00:00Z`))) throw new Error("Enter a valid settlement date.");
  if (sourceNote.trim().length < 8) throw new Error("Identify the agreement or source used to verify the settlement.");
  const now = new Date().toISOString();
  const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountCents / 100);
  const firmNotice = `Settlement recorded for ${dollars} on ${settledOn}. Verify liens and bills, then prepare the closing statement. Net proceeds and payment dates are not yet confirmed.`;
  const providerNotice = `This case settled on ${settledOn}. The firm is reconciling outstanding bills and liens. Please confirm your final balance; payment timing is not yet confirmed.`;
  await db.transaction(async () => {
    await db.prepare(`INSERT INTO case_settlements (matter_id, amount_cents, settled_on, source_note, show_amount_to_provider, firm_notice, provider_notice, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(matter_id) DO UPDATE SET amount_cents=excluded.amount_cents, settled_on=excluded.settled_on,
      source_note=excluded.source_note, show_amount_to_provider=excluded.show_amount_to_provider, firm_notice=excluded.firm_notice,
      provider_notice=excluded.provider_notice, updated_at=excluded.updated_at`)
      .run(digest.matterId, amountCents, settledOn, sourceNote.trim(), Number(showAmountToProvider), firmNotice, providerNotice, now);
    const workflow = db.prepare(`INSERT INTO case_workflows (id, matter_id, document_id, kind, title, content, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, content=excluded.content`);
    await workflow.run(`settlement-liens-${digest.matterId}`, digest.matterId, "settlement", "task", "Reconcile final bills and liens", `Settlement: ${dollars} on ${settledOn}. Request final balances from each treating provider and reconcile liens before disbursement. Verified from: ${sourceNote.trim()}.`, "open", now);
    await workflow.run(`settlement-statement-${digest.matterId}`, digest.matterId, "settlement", "task", "Prepare closing statement", `Settlement: ${dollars} on ${settledOn}. After balances and fees are verified, prepare the closing statement for attorney review. Do not estimate net proceeds from the gross settlement alone.`, "open", now);
    for (const provider of digest.providers) {
      await workflow.run(`settlement-provider-${digest.matterId}-${provider.id}`, digest.matterId, `provider:${provider.id}`, "contact", `Settlement update for ${provider.name}`, `To: ${provider.name}\nSubject: Settlement update for ${digest.clientName}\n\n${providerNotice}${showAmountToProvider ? ` The gross settlement amount is ${dollars}.` : ""}\n\nPlease send your final itemized balance and any lien information to the firm. We will follow up after reconciliation.`, "draft", now);
    }
  })();
  invalidateLocalCache("matters", `digest:${digest.matterId}:default`);
  return (await getSettlement(digest.matterId))!;
}

export async function removeSettlement(matterId: string) {
  await db.transaction(async () => {
    await db.prepare("DELETE FROM case_settlements WHERE matter_id = ?").run(matterId);
    await db.prepare("DELETE FROM case_workflows WHERE matter_id = ? AND (document_id = 'settlement' OR id LIKE ?)").run(matterId, `settlement-provider-${matterId}-%`);
  })();
  invalidateLocalCache("matters", `digest:${matterId}:default`);
}
