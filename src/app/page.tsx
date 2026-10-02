import Link from "next/link";
import { Briefcase, Stethoscope } from "lucide-react";

// Character select: two choices only (Hick's law), each opens its own panel.
// Picking "provider" shows nothing by itself; a share code or link is still required.
const ROLES = [
  {
    href: "/firm",
    icon: Briefcase,
    title: "I work at the firm",
    body: "Get up to speed on a case in 90 seconds, then dig into anything.",
    cta: "Open my cases",
  },
  {
    href: "/provider",
    icon: Stethoscope,
    title: "I'm a medical provider",
    body: "See where your patient's case stands and what the firm needs from you.",
    cta: "Enter share code",
  },
];

export default function RoleSelect() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-16">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Case Digest</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">Who&apos;s checking in?</h1>
        <p className="mt-2 text-slate-600">Pick your side. You can switch any time.</p>
      </div>
      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {ROLES.map(({ href, icon: Icon, title, body, cta }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-4 rounded-3xl border-2 border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:border-blue-500 hover:shadow-lg focus-visible:border-blue-500 focus-visible:outline-none"
          >
            <span className="grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
              <Icon className="size-7" />
            </span>
            <span className="text-xl font-semibold text-slate-900">{title}</span>
            <span className="text-sm text-slate-600">{body}</span>
            <span className="mt-auto text-sm font-medium text-blue-700">{cta} →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
