import Link from "next/link";
import { Briefcase } from "lucide-react";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Briefly home" className={`inline-flex items-center gap-2 font-semibold tracking-tight text-blue-700 ${className}`}>
      <span className="grid size-7 place-items-center rounded-lg bg-blue-600 text-white" aria-hidden="true">
        <Briefcase className="size-4" strokeWidth={2.2} />
      </span>
      <span>Briefly</span>
    </Link>
  );
}
