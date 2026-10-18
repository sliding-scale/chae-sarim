import { initials } from "@/lib/workspace-data";

const tones = ["is-tone-0", "is-tone-1", "is-tone-2", "is-tone-3", "is-tone-4", "is-tone-5"] as const;

// Picks a stable initials colour from the name.
function avatarTone(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % tones.length;
  return tones[hash];
}

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
  const classes = [muted ? "avatar is-muted" : `avatar ${avatarTone(name)}`, className].filter(Boolean).join(" ");
  if (imageUrl) {
    return <img className={`${classes} avatar-image`} src={imageUrl} alt="" aria-hidden="true" />;
  }
  return (
    <span className={classes} aria-hidden="true">
      {initials(name) || "•"}
    </span>
  );
}
