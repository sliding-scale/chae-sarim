import { initials } from "@/lib/workspace-data";

// Shows a person's initials in a circle.
export function UserAvatar({ name, muted = false }: { name: string; muted?: boolean }) {
  return (
    <span className={muted ? "avatar is-muted" : "avatar"} aria-hidden="true">
      {initials(name) || "•"}
    </span>
  );
}
