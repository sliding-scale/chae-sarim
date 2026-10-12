import Link from "next/link";

// Renders the Chae logo and links it to the given path.
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Chae home">
      <span className="logo-mark" aria-hidden="true">
        ◆
      </span>
      <span className="logo-word">Chae</span>
    </Link>
  );
}
