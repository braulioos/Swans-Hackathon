import { notFound } from "next/navigation";
import { getCaseDigest, getShare, recordShareView } from "@/lib/data";
import { buildSharePacket } from "@/lib/share";
import { ProviderView } from "@/components/provider/ProviderView";

// Provider panel. The filter runs here on the server; only the packet is sent to the browser.
export default async function ProviderSharePage(props: PageProps<"/share/[token]">) {
  const { token } = await props.params;
  const share = await getShare(token);
  if (!share) notFound();
  const digest = await getCaseDigest(share.matterId);
  if (!digest) notFound();

  // Receipt for the attorney: "has anyone in their office opened it?"
  recordShareView(token, "Provider office");
  const packet = buildSharePacket(digest, share);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <ProviderView packet={packet} />
    </main>
  );
}
