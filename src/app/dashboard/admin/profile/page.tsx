import { ProfileSettings } from "@/components/profile/ProfileSettings";

export const metadata = { title: "Profile" };

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the signed-in administrator's profile settings.
export default function Page() {
  return <ProfileSettings />;
}
