import { Calendar, Database, FileText, Mail, NotebookPen, Phone, Receipt, SquareCheck, User } from "lucide-react";
import type { SourceKind } from "@/lib/types";

export const SOURCE_ICON: Record<SourceKind, typeof FileText> = {
  note: NotebookPen,
  email: Mail,
  call: Phone,
  document: FileText,
  task: SquareCheck,
  calendar: Calendar,
  expense: Receipt,
  field: Database,
  contact: User,
};
