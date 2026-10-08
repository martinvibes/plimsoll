import { Briefcase, Landmark, Server, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Role } from "@/lib/plimsoll/personas";

export const ROLE_ICON: Record<Role, LucideIcon> = {
  fund: Briefcase,
  node: Server,
  reader: Landmark,
  auditor: ShieldCheck,
};
