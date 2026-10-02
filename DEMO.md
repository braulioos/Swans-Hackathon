# Case Digest demonstration

Use Node 24 to run `npm ci` and `npm run dev`. Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The local `.env.local` holds the Anthropic and Clio app credentials and is ignored by Git. A browser user must still authorize Clio before the app can read a real case.

## 1. Find a document by asking AI

Choose **I work at the firm** → **Sapini (mock)** → **Find documents**. Ask “Where is the MRI showing the lumbar injury?” The response finds `d-12` and explicitly says this demo has a case reference, not the original MRI file. Try “Find bills and lien reduction requests” to see the same retrieval across the case record and scanned uploads.

## 2. Show a live provider document scan

Choose **I’m a medical provider**, enter share code `demo`, and download the sample [PDF](public/demo-provider-response.pdf) or [text file](public/demo-provider-response.txt). Upload it using **Upload and scan**. This generated sample repeats the existing Sapini fixture values and asks for an updated PT bill and written lien response. It is marked as demonstration material, not an original medical record.

Return to the firm’s Sapini case, choose **Find documents**, then **Refresh inbox**. Open the provider document’s scan. Show its summary, request, significance, page references, and facts checked against the case. A fact tagged “corroborated” displays the independent source ID. A new or conflicting fact stays visibly separate. Click **Add to case review log** to record a fact with its source and cross check status.

## 3. Run a one click workflow

On the scanned document, click the suggested contact action. Claude creates a ready to review message and checklist using the scan and the case file, then saves it in **One click workflows**. Open the draft and choose **Open email draft** to prefill an email for review. A task suggestion creates an open internal task that can be marked done. Filing workflows produce a downloadable preparation packet. The app does not send messages, file forms, or write to Clio. A court filing suggestion appears only when a scanned document actually calls for a form or court action.

The **Needs attention** actions now jump to **Request missing records** or **One click workflows**. In the workflow panel, choose **Prepare workflow** beside a suggested task. The app creates an internal task and, when the action calls for contact, a reviewable message draft. Prepared work appears as cards with status, next action, steps, and evidence. Repeating the same action opens its saved work immediately. Existing tasks in the full case file also link to these controls.

## 4. Show the real Clio path

On **Your matters**, choose **Connect Clio** and authorize the configured developer app. Then use **Sync Sapini**. Synced matters appear alongside the labeled demo fixture. Open a real matter → **Find documents**. Clio documents have **Open** and **Scan with AI** actions. The scan downloads the actual Clio file through the read only API and compares its contents with all synced case items, the case digest, provider data, and prior scans. The app saves scanned files and drafts only in its local `.data` folder, which Git ignores.

In the current local workspace, the real Sapini matter is already synced. Its SportsCare Physical Therapy itemized bill has a completed AI scan, a contact draft, an open internal task, and a newly extracted bill detail in the case review log. Search for “SportsCare physical therapy bill” to show the real document retrieval path. On a fresh checkout, authorize and sync Clio again; the local `.data` state does not travel with Git.

## 5. Request records and communicate a settlement

On a firm case, use **Request missing records** in the document copilot. A provider button prepares a case-based request draft and an internal follow-up task. The provider share link shows the document request when its **Requests** section is enabled. Open **One click workflows** to review or email the draft.

For the settlement demo, use the **Settlement updates** panel below the document copilot. Enter a verified gross amount, date, and source note. The case switches to the settlement stage; the firm sees bill and lien reconciliation work; active provider share links show a settlement notice. The checkbox controls whether providers see the gross value. Email drafts for each treating provider and firm closing tasks appear in **One click workflows**. Use a case source for this demo entry; no settlement is prefilled or invented.

## Demo boundaries

- The supplied case fixture has document references but no original document files. The generated sample is present solely to exercise scanning in a live demo.
- Provider uploads need a valid share token. Accepted files remain in the inbox if Claude is unavailable; the firm can retry the scan.
- When the full case evidence is too large for a single exhaustive cross check, the scan stops with a visible error rather than silently dropping sources.
- The Clio client is read only. External contact and court filing require human review and a separate sending or filing integration.
