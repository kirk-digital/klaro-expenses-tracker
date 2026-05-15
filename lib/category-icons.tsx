import {
  Plane,
  UtensilsCrossed,
  Monitor,
  Paperclip,
  Cpu,
  Phone,
  Megaphone,
  GraduationCap,
  Briefcase,
  HelpCircle,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Travel: Plane,
  "Meals & Entertainment": UtensilsCrossed,
  "Software & Subscriptions": Monitor,
  "Office Supplies": Paperclip,
  Hardware: Cpu,
  "Phone & Utilities": Phone,
  "Marketing & Advertising": Megaphone,
  "Training & Education": GraduationCap,
  "Professional Services": Briefcase,
  Other: HelpCircle,
};

export function getCategoryIcon(name: string) {
  return CATEGORY_ICONS[name] ?? HelpCircle;
}
