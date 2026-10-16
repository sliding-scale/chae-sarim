"use client";

import { ActivityTime } from "@/components/dashboard/ActivityFeed";
import { useWorkspace } from "@/components/layout/RoleGate";
import { UserAvatar } from "@/components/users/UserAvatar";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useRef } from "react";

// Shows company updates on the dashboard so the notification bell is not needed.
export function RecentActivity() {
  const workspace = useWorkspace();
  const notifications = useQuery(api.notifications.queries.listMine);
  const markRead = useMutation(api.notifications.mutations.markRead);
  const catchUpPending = useMutation(api.notifications.mutations.catchUpPending);
  const caughtUp = useRef(false);

  useEffect(() => {
    if (workspace.role !== "admin" || caughtUp.current) return;
    let cancelled = false;

    async function run() {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
        try {
          await catchUpPending({});
          caughtUp.current = true;
          return;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [catchUpPending, workspace.role]);

  // Marks an update as seen when it is opened.
  function onOpen(notificationId: Id<"notifications">, read: boolean) {
    if (!read) void markRead({ notificationId });
  }

  return (
    <section className="saas-card feed-card">
      <h2 className="panel-title">Recent activity</h2>
      <p className="panel-copy">Latest updates from your team</p>
      {notifications === undefined ? (
        <p className="invite-note">Loading activity…</p>
      ) : notifications.length === 0 ? (
        <div className="empty-panel">
          <h3 className="panel-title">Nothing new yet</h3>
          <p className="panel-copy">Invites, submissions, and decisions will show up here.</p>
        </div>
      ) : (
        <div className="activity-list">
          {notifications.map((item) => (
            <Link
              key={item.notificationId}
              href={item.href}
              className={item.read ? "activity-row" : "activity-row is-unread"}
              onClick={() => onOpen(item.notificationId, item.read)}
            >
              <UserAvatar name={item.actor} imageUrl={item.imageUrl} />
              <div>
                <p className="activity-line">
                  <strong>{item.actor}</strong> {item.action}
                </p>
                <p className="activity-time">
                  <ActivityTime value={item.createdAt} />
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
