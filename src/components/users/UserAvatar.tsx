import { initials } from "@/lib/workspace-data";

// Shows a person's photo, or their initials when they have not uploaded one.
export function UserAvatar({
  name,
  imageUrl,
  muted = false,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  muted?: boolean;
  className?: string;
}) {
  const classes = [muted ? "avatar is-muted" : "avatar", className].filter(Boolean).join(" ");
  if (imageUrl) {
    return <img className={`${classes} avatar-image`} src={imageUrl} alt="" aria-hidden="true" />;
  }
  return (
    <span className={classes} aria-hidden="true">
      {initials(name) || "•"}
    </span>
  );
}
