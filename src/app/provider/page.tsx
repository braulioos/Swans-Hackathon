"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Brand } from "@/components/Brand";

export default function ProviderEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div><Brand className="mb-5 text-base" /></div>
        <Link href="/" className="block text-sm text-slate-500 hover:underline">
          ← Switch role
        </Link>
        <span className="mt-4 grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <KeyRound className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Open a shared case</h1>
        <p className="mt-1 text-sm text-slate-600">Use the link or code the law firm sent you.</p>
        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const token = code.trim().split("/share/").pop()?.split(/[?#]/)[0] ?? "";
            if (token) router.push(`/share/${encodeURIComponent(token)}`);
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste the link or code"
            aria-label="Share code"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Open
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-500">
          The firm creates this link under <span className="font-medium">Share with provider</span>. It only shows what they chose to share.
        </p>
      </div>
    </main>
  );
}
