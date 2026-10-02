import Link from "next/link";
import { notFound } from "next/navigation";
import { getCaseDigest, getShare, listShares, newShareDraft } from "@/lib/data";
import { ShareBuilder } from "@/components/provider/ShareBuilder";

export default async function SharePage(props: PageProps<"/firm/matter/[id]/share">) {
  const { id } = await props.params;
  const digest = await getCaseDigest(id);
  if (!digest) notFound();

  const existing = await listShares(id);
  const initial = process.env.DATA_SOURCE === "clio" ? newShareDraft(digest) : await getShare("demo");
  if (!initial) notFound();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <Link href={`/firm/matter/${id}`} className="text-sm text-slate-500 hover:underline">
        ← Back to {digest.clientName}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">Share with a provider</h1>
      <p className="mb-6 text-sm text-slate-600">Pick what they see. The preview on the right is exactly what they get.</p>
      <ShareBuilder digest={digest} initial={initial} existing={existing} />
    </main>
  );
}
