import { verifyWebhook } from "@clerk/backend/webhooks";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Verifies a Clerk webhook, then creates, updates, or deletes the matching Convex user.
const handleClerkWebhook = httpAction(async (ctx, request) => {
  const event = await verifyWebhook(request, {
    signingSecret: process.env.CLERK_WEBHOOK_SECRET!,
  });

  if (event.type === "user.created" || event.type === "user.updated") {
    const email =
      event.data.email_addresses.find(
        (item) => item.id === event.data.primary_email_address_id,
      )?.email_address ?? "";
    const name =
      [event.data.first_name, event.data.last_name].filter(Boolean).join(" ") ||
      "Unknown";

    await ctx.runMutation(internal.users.mutations.createOrUpdateFromClerk, {
      clerkId: event.data.id,
      email,
      name,
    });
  }

  if (event.type === "user.deleted" && event.data.id) {
    await ctx.runMutation(internal.users.mutations.deleteByClerkId, {
      clerkId: event.data.id,
    });
  }

  return new Response(null, { status: 200 });
});

const http = httpRouter();
http.route({
  path: "/clerk/register",
  method: "POST",
  handler: handleClerkWebhook,
});

export default http;