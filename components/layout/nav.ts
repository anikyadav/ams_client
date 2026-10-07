import {
  Briefcase,
  Building2,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["AUDITOR", "STAFF"] },
  {
    href: "/engagements",
    label: "Engagements",
    icon: Briefcase,
    roles: ["AUDITOR", "STAFF"],
  },
  {
    href: "/tasks",
    label: "My work",
    icon: ListChecks,
    roles: ["STAFF"],
  },
  { href: "/work", label: "Team work", icon: ListTodo, roles: ["AUDITOR"] },
  { href: "/clients", label: "Clients", icon: Building2, roles: ["AUDITOR"] },
  { href: "/staff", label: "Staff", icon: Users, roles: ["AUDITOR"] },
];

export const brand = {
  name: "AMS",
  fullName: "Audit Management System",
  tagline: "Digital Assurance | Compliance | Efficiency",
  mark: "/ams_mark.png",
  logo: "/ams_logo.png",
};
