import { notFound } from "next/navigation";
import { getCaseDigest, getShare, recordShareView } from "@/lib/data";
import { buildSharePacket } from "@/lib/share";
import { ProviderView } from "@/components/provider/ProviderView";
import { ProviderDocumentUpload } from "@/components/provider/ProviderDocumentUpload";
import { getSettlement } from "@/lib/settlement";

// Provider panel. The filter runs here on the server; only the packet is sent to the browser.
export default async function ProviderSharePage(props: PageProps<"/share/[token]">) {
  const { token } = await props.params;
  const share = await getShare(token);
  if (!share) notFound();
  const digest = await getCaseDigest(share.matterId);
  if (!digest) notFound();

  // Receipt for the attorney: "has anyone in their office opened it?"
  await recordShareView(token, "Provider office");
  const packet = buildSharePacket(digest, share);
  const settlement = await getSettlement(digest.matterId);
  if (settlement) {
    packet.settlementNotice = {
      settledOn: settlement.settledOn,
      amount: settlement.showAmountToProvider ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(settlement.amountCents / 100) : undefined,
      message: settlement.providerNotice,
    };
    packet.stage = "settlement";
    packet.caseAlive = false;
    packet.statusLine = "Case settled; final balances are being reconciled";
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <ProviderView packet={packet} />
      <div className="mt-5"><ProviderDocumentUpload token={token} /></div>
      {digest.matterId === "sapini" && <p className="mt-2 text-xs text-slate-500">Demo: download a case-based sample <a className="font-medium text-blue-700 underline" href="/demo-provider-response.pdf" download>PDF</a> or <a className="font-medium text-blue-700 underline" href="/demo-provider-response.txt" download>text file</a> to try the live AI scan. This generated sample is not an original provider record.</p>}
    </main>
  );
}
