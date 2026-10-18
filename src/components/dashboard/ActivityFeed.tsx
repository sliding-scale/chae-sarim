"use client";

import { UserAvatar } from "@/components/users/UserAvatar";
import { useEffect, useState } from "react";

export type ActivityItem = {
  id: string;
  actor: string;
  action: string;
  meta?: string;
  time: string;
};

// Turns a stored timestamp into a short relative label.
function formatAgo(value: number) {
  const minutes = Math.max(0, Math.round((Date.now() - value) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Shows when something happened, after the page has loaded in the browser.
export function ActivityTime({ value }: { value: number }) {
  const [label, setLabel] = useState("Recently");

  useEffect(() => {
    setLabel(formatAgo(value));
  }, [value]);

  return <time dateTime={new Date(value).toISOString()}>{label}</time>;
}

// Lists recent activity rows on a dashboard card.
export function ActivityFeed({ items }: { items: readonly ActivityItem[] }) {
  return (
    <div className="activity-list">
      {items.map((item) => (
        <article key={item.id} className="activity-row">
          <UserAvatar name={item.actor} />
          <div>
            <p className="activity-line">
              <strong>{item.actor}</strong> {item.action}
              {item.meta ? ` ${item.meta}` : ""}
            </p>
            <p className="activity-time">{item.time}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
