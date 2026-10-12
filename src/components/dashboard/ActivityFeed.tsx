import { UserAvatar } from "@/components/users/UserAvatar";

export type ActivityItem = {
  id: string;
  actor: string;
  action: string;
  meta?: string;
  time: string;
};

// Lists recent activity rows on a dashboard card.
export function ActivityFeed({ items }: { items: readonly ActivityItem[] }) {
  return (
    <div>
      {items.map((item) => (
        <article key={item.id} className="activity-row">
          <UserAvatar name={item.actor === "You" ? "Alex Johnson" : item.actor} />
          <div>
            <strong>{item.actor}</strong>
            <p>
              {item.action}
              {item.meta ? ` · ${item.meta}` : ""}
            </p>
          </div>
          <time className="activity-time">{item.time}</time>
        </article>
      ))}
    </div>
  );
}
