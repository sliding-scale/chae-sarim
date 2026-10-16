import { Building2 } from "lucide-react";

// Shows a company photo, or a building icon when the company has not added one.
export function CompanyMark({
  imageUrl,
  size = 16,
}: {
  imageUrl?: string | null;
  size?: number;
}) {
  if (imageUrl) return <img src={imageUrl} alt="" />;
  return <Building2 size={size} aria-hidden="true" />;
}
