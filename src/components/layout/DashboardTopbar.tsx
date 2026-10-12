"use client";

import { UserAvatar } from "@/components/users/UserAvatar";
import type { AppRole } from "@/lib/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { SignOutButton } from "@clerk/nextjs";
import { Bell, HelpCircle, LogOut, Menu, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Renders the dashboard title bar, menus, and sign-out control.
export function DashboardTopbar({
  title,
  role,
  name,
  onMenu,
}: {
  title: string;
  role: AppRole;
  name: string;
  onMenu: () => void;
}) {
  const [open, setOpen] = useState<"alerts" | "help" | "account" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const notifications = useQuery(api.notifications.queries.listMine);
  const markRead = useMutation(api.notifications.mutations.markRead);
  const catchUpPending = useMutation(api.notifications.mutations.catchUpPending);
  const unread = notifications?.filter((item) => !item.read).length ?? 0;
  const caughtUp = useRef(false);

  useEffect(() => {
    if (role !== "admin" || caughtUp.current) return;
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
  }, [catchUpPending, role]);

  // Opens a notification and marks it read.
  async function openNotification(notificationId: Id<"notifications">, href: string, read: boolean) {
    setOpen(null);
    if (!read) await markRead({ notificationId });
    router.push(href);
  }

  useEffect(() => {
    // Closes an open menu when the pointer lands outside it.
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    }
    // Closes an open menu when Escape is pressed.
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="dashboard-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" className="menu-toggle" aria-label="Open navigation" onClick={onMenu}>
          <Menu size={18} />
        </button>
        <h1 className="page-title" style={{ fontSize: "1.15rem" }}>
          {title}
        </h1>
      </div>
      <div className="topbar-actions" ref={rootRef}>
        <div className="menu">
          <button
            type="button"
            className="icon-button"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            aria-expanded={open === "alerts"}
            onClick={() => setOpen(open === "alerts" ? null : "alerts")}
          >
            <Bell size={18} />
            {unread > 0 ? <span className="alert-dot" /> : null}
          </button>
          {open === "alerts" ? (
            <div className="menu-panel alerts-panel" role="menu">
              {notifications === undefined ? (
                <p className="menu-note">Loading notifications…</p>
              ) : notifications.length === 0 ? (
                <p className="menu-note">No notifications yet.</p>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.notificationId}
                    type="button"
                    className={item.read ? "alert-item" : "alert-item is-unread"}
                    onClick={() => openNotification(item.notificationId, item.href, item.read)}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
        <div className="menu">
          <button
            type="button"
            className="icon-button"
            aria-label="Help"
            aria-expanded={open === "help"}
            onClick={() => setOpen(open === "help" ? null : "help")}
          >
            <HelpCircle size={18} />
          </button>
          {open === "help" ? (
            <div className="menu-panel" role="menu">
              <Link href="/documentation" onClick={() => setOpen(null)}>
                Documentation
              </Link>
              <Link href="/#security" onClick={() => setOpen(null)}>
                Security overview
              </Link>
            </div>
          ) : null}
        </div>
        <div className="menu">
          <button
            type="button"
            className="icon-button"
            aria-label="Account menu"
            aria-expanded={open === "account"}
            onClick={() => setOpen(open === "account" ? null : "account")}
          >
            <UserAvatar name={name} />
          </button>
          {open === "account" ? (
            <div className="menu-panel" role="menu">
              <div className="user-chip" style={{ padding: "8px 10px 10px" }}>
                <div>
                  <strong>{name}</strong>
                  <span>{role === "admin" ? "Administrator" : "Worker"}</span>
                </div>
              </div>
              <Link href={role === "admin" ? "/dashboard/admin/workers" : "/dashboard/worker"} onClick={() => setOpen(null)}>
                <User size={16} />
                {role === "admin" ? "Workers" : "My work"}
              </Link>
              <SignOutButton redirectUrl="/">
                <button type="button">
                  <LogOut size={16} />
                  Sign out
                </button>
              </SignOutButton>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

// Returns the top-bar title for the current dashboard path.
export function titleFor(pathname: string, role: AppRole) {
  if (role === "worker") {
    if (pathname.startsWith("/dashboard/worker/timesheets")) return "Timesheets";
    if (pathname.startsWith("/dashboard/worker/invoices")) return "Invoices";
    if (pathname.startsWith("/dashboard/worker/holidays")) return "Holidays";
    return "Overview";
  }
  if (pathname.startsWith("/dashboard/admin/workers")) return "Workers";
  if (pathname.startsWith("/dashboard/admin/job-sites")) return "Job sites";
  if (pathname.startsWith("/dashboard/admin/timesheets")) return "Timesheets";
  if (pathname.startsWith("/dashboard/admin/invoices")) return "Invoices";
  if (pathname.startsWith("/dashboard/admin/holidays")) return "Holidays";
  return "Overview";
}
