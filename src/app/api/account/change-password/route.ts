import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Replaces the signed-in person's password after checking the temporary one.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "You need to sign in." }, { status: 401 });

  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Password changes are not configured yet." }, { status: 500 });

  const body = (await request.json().catch(() => null)) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  } | null;
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Enter your current password and a new password." }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "Choose a password that is different from the temporary one." }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };
  const verified = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}/verify_password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ password: currentPassword }),
  });
  const verification = (await verified.json().catch(() => null)) as { verified?: boolean } | null;
  if (!verified.ok || verification?.verified === false) {
    return NextResponse.json({ error: "That temporary password is not correct." }, { status: 400 });
  }

  const current = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, { headers });
  const user = (await current.json().catch(() => null)) as { public_metadata?: Record<string, unknown> } | null;
  if (!current.ok || !user) {
    return NextResponse.json({ error: "Could not change your password." }, { status: 502 });
  }

  const updated = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      password: newPassword,
      public_metadata: { ...(user.public_metadata ?? {}), mustChangePassword: false },
    }),
  });
  if (!updated.ok) {
    const details = (await updated.json().catch(() => null)) as {
      errors?: { long_message?: string; message?: string }[];
    } | null;
    const message = details?.errors?.[0]?.long_message || details?.errors?.[0]?.message;
    return NextResponse.json({ error: message || "Could not change your password." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
