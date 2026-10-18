import Link from "next/link";
import { ChaeMark } from "@/components/brand/ChaeMark";

// Renders the Chae logo and links it to the given path.
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Chae home">
      <ChaeMark className="logo-mark" />
      <span className="logo-word">Chae</span>
    </Link>
  );
}
