"use client";

import {
  AppDataTable,
  DataTableColumnHeader,
  TableFigure,
  TableLongText,
  TableMuted,
  TableName,
  TableStatus,
  formatDateRange,
} from "@/components/lists/AppDataTable";
import type { DataTableFeatures } from "@/components/lists/data-table-features";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { ContentHeading } from "@/components/dashboard/ContentHeading";
import { NoSitesNotice } from "@/components/dashboard/NoSitesNotice";
import { useWorkspace } from "@/components/layout/RoleGate";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { createColumnHelper } from "@tanstack/react-table";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { Clock } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

const dayLabels = [
  ["monday", "Monday"],
  ["tuesday", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["thursday", "Thursday"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"],
] as const;

type DayKey = (typeof dayLabels)[number][0];
type HoursForm = Record<DayKey, string>;
type TimesheetStatus = "draft" | "pending" | "approved" | "rejected";

type TimesheetRow = {
  timesheetId: Id<"timesheets">;
  jobSiteId: Id<"jobSites">;
  jobSiteName: string;
  weekStart: string;
  weekEnd: string;
  comments: string | null;
  hours: Record<DayKey, number>;
  totalHours: number;
  status: TimesheetStatus;
  rejectionReason: string | null;
  updatedAt: number;
};

// Reads a user-facing message from a Convex error.
function errorText(error: unknown, fallback: string) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return fallback;
}

// Formats a local date as YYYY-MM-DD.
function isoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Formats an hour count, keeping a decimal only when the value is not whole.
function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

// Lists only the days with hours, such as "Mon 8 · Tue 8 · Wed 4".
function workedDays(hours: Record<DayKey, number>) {
  const days = dayLabels.filter(([key]) => hours[key] > 0).map(([key, label]) => `${label.slice(0, 3)} ${formatHours(hours[key])}`);
  return days.length > 0 ? days.join(" · ") : "No hours";
}

// Returns Monday of the week that contains today, in the browser's calendar.
function currentMonday() {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  return monday;
}

// Builds the current week and the previous fifteen weeks, newest first.
function weekChoices() {
  const monday = currentMonday();
  return Array.from({ length: 16 }, (_, index) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() - index * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const weekStart = isoDate(start);
    const label = formatDateRange(weekStart, isoDate(end));
    return { weekStart, label: index === 0 ? `This week (${label})` : label };
  });
}

// Returns a blank hours form.
function blankHours(): HoursForm {
  return {
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: "",
  };
}

// Copies stored hours into the form, leaving a zero day blank.
function hoursToForm(hours: Record<DayKey, number>): HoursForm {
  const form = blankHours();
  for (const [key] of dayLabels) {
    form[key] = hours[key] === 0 ? "" : formatHours(hours[key]);
  }
  return form;
}

// Turns the form into numbers, treating a blank day as zero.
function hoursFromForm(hours: HoursForm) {
  const parsed = {} as Record<DayKey, number>;
  for (const [key, label] of dayLabels) {
    const raw = hours[key].trim();
    if (!raw) {
      parsed[key] = 0;
      continue;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`Enter a number for ${label}.`);
    parsed[key] = value;
  }
  return parsed;
}

// Lets a worker submit weekly hours for one job site in their company.
export function WorkerTimesheetsPanel() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "your company";
  const sites = useQuery(api.jobSites.queries.listWorkerJobSites);
  const timesheets = useQuery(api.timesheets.queries.listMyTimesheets);
  const submitTimesheet = useMutation(api.timesheets.mutations.submitTimesheet);
  const weeks = useMemo(() => weekChoices(), []);
  const [jobSiteChoice, setJobSiteChoice] = useState<Id<"jobSites"> | null>(null);
  const [weekStart, setWeekStart] = useState(weeks[0]?.weekStart ?? "");
  const jobSiteId = jobSiteChoice ?? sites?.[0]?.jobSiteId ?? "";
  const selected =
    timesheets?.find((row) => row.jobSiteId === jobSiteId && row.weekStart === weekStart) ?? null;
  const loading = sites === undefined || timesheets === undefined;

  return (
    <>
      <ContentHeading title="Timesheets" description="Submit the hours you worked and follow each week." />
      <section className="worker-card time-off-card">
        <div className="time-off-head">
          <span className="time-off-icon">
            <Clock aria-hidden="true" />
          </span>
          <div className="time-off-copy">
            <h2 className="panel-title">Submit a week</h2>
            <p className="panel-copy">
              Record the hours you worked for {company}. An administrator reviews the week after you submit. A blank day counts as 0.
            </p>
          </div>
        </div>
        {loading ? (
          <p className="invite-note">Loading job sites…</p>
        ) : sites.length === 0 ? (
          <NoSitesNotice message="Ask an administrator to assign a job site before you submit hours." />
        ) : (
          <TimesheetForm
            key={`${jobSiteId}:${weekStart}:${selected?.updatedAt ?? "new"}`}
            sites={sites}
            weeks={weeks}
            jobSiteId={jobSiteId}
            weekStart={weekStart}
            existing={selected}
            onJobSite={setJobSiteChoice}
            onWeek={setWeekStart}
            submitTimesheet={submitTimesheet}
          />
        )}
      </section>

      <section className="worker-card">
        <h2 className="panel-title">Your timesheets</h2>
        <p className="panel-copy">Weeks you have submitted for {company}.</p>
        {timesheets === undefined ? (
          <p className="invite-note">Loading timesheets…</p>
        ) : (
          <TimesheetTable rows={timesheets} />
        )}
      </section>
    </>
  );
}

// Holds the hours for one job site and week, and remounts when that choice changes.
function TimesheetForm({
  sites,
  weeks,
  jobSiteId,
  weekStart,
  existing,
  onJobSite,
  onWeek,
  submitTimesheet,
}: {
  sites: { jobSiteId: Id<"jobSites">; name: string }[];
  weeks: { weekStart: string; label: string }[];
  jobSiteId: Id<"jobSites"> | "";
  weekStart: string;
  existing: TimesheetRow | null;
  onJobSite: (jobSiteId: Id<"jobSites">) => void;
  onWeek: (weekStart: string) => void;
  submitTimesheet: (args: {
    jobSiteId: Id<"jobSites">;
    weekStart: string;
    comments?: string;
    hours: Record<DayKey, number>;
  }) => Promise<unknown>;
}) {
  const [hours, setHours] = useState<HoursForm>(() => (existing ? hoursToForm(existing.hours) : blankHours()));
  const [comments, setComments] = useState(existing?.comments ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const locked = existing?.status === "approved";
  const total = dayLabels.reduce((sum, [key]) => {
    const value = Number(hours[key]);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  const hoursReady = dayLabels.every(([key]) => {
    const raw = hours[key].trim();
    if (!raw) return true;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 && value <= 24;
  });
  const submitLabel =
    existing?.status === "pending"
      ? "Update timesheet"
      : existing?.status === "rejected"
        ? "Resubmit timesheet"
        : "Submit timesheet";

  // Submits the selected week, or updates a week that is still pending or rejected.
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!jobSiteId || locked) return;
    const { accepted } = await confirm({
      title: submitLabel,
      body:
        existing?.status === "pending"
          ? "Update this timesheet and send it for review?"
          : existing?.status === "rejected"
            ? "Resubmit this timesheet for review?"
            : "Submit this timesheet for review?",
      confirmLabel: submitLabel,
      tone: "primary",
    });
    if (!accepted) return;
    setBusy(true);
    setError("");
    try {
      await submitTimesheet({
        jobSiteId,
        weekStart,
        comments: comments.trim() || undefined,
        hours: hoursFromForm(hours),
      });
    } catch (caught) {
      setError(errorText(caught, caught instanceof Error ? caught.message : "Could not submit that timesheet."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="timesheet-form" onSubmit={onSubmit} noValidate>
      {existing?.status === "rejected" && existing.rejectionReason ? (
        <p className="field-error">Rejected: {existing.rejectionReason}</p>
      ) : null}
      <div className="timesheet-fields">
        <div>
          <label className="form-label" htmlFor="timesheet-site">
            Job site
            <RequiredMark />
          </label>
          <select
            id="timesheet-site"
            className="input-saas"
            value={jobSiteId}
            disabled={busy}
            onChange={(event) => onJobSite(event.target.value as Id<"jobSites">)}
          >
            {sites.map((site) => (
              <option key={site.jobSiteId} value={site.jobSiteId}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="timesheet-week">
            Week
            <RequiredMark />
          </label>
          <select
            id="timesheet-week"
            className="input-saas"
            value={weekStart}
            disabled={busy}
            onChange={(event) => onWeek(event.target.value)}
          >
            {weeks.map((week) => (
              <option key={week.weekStart} value={week.weekStart}>
                {week.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="hours-fieldset" disabled={busy || locked}>
        <legend className="form-label">Hours</legend>
        <div className="hours-grid">
          {dayLabels.map(([key, label]) => (
            <div key={key}>
              <label className="form-label" htmlFor={`hours-${key}`}>
                {label}
              </label>
              <input
                id={`hours-${key}`}
                className="input-saas"
                inputMode="decimal"
                name={key}
                value={hours[key]}
                placeholder="0"
                aria-invalid={error ? true : undefined}
                onChange={(event) => {
                  setHours((current) => ({ ...current, [key]: event.target.value }));
                  if (error) setError("");
                }}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="form-label" htmlFor="timesheet-comments">
          Comments
        </label>
        <textarea
          id="timesheet-comments"
          className="input-saas timesheet-comments"
          name="comments"
          value={comments}
          placeholder="Optional"
          maxLength={500}
          disabled={busy || locked}
          onChange={(event) => setComments(event.target.value)}
        />
      </div>

      <div className="timesheet-submit">
        <p className="invite-note">Total {formatHours(total)}h</p>
        {locked ? (
          <p className="invite-note">This week is already approved for that job site.</p>
        ) : (
          <button className="btn-primary" type="submit" disabled={busy || !jobSiteId || !weekStart || !hoursReady}>
            {busy ? "Saving…" : submitLabel}
          </button>
        )}
      </div>
      {error ? <p className="field-error">{error}</p> : null}
    </form>
  );
}

const workerTimesheetColumns = createColumnHelper<DataTableFeatures, TimesheetRow>();

// Renders the worker's submitted weeks.
function TimesheetTable({ rows }: { rows: TimesheetRow[] }) {
  const columns = useMemo(
    () =>
      workerTimesheetColumns.columns([
        workerTimesheetColumns.accessor("jobSiteName", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Job Site" />,
          cell: ({ row }) => <TableName>{row.original.jobSiteName}</TableName>,
          sortFn: "text",
        }),
        workerTimesheetColumns.accessor("weekStart", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Week" />,
          cell: ({ row }) => <TableMuted>{formatDateRange(row.original.weekStart, row.original.weekEnd)}</TableMuted>,
          sortFn: "alphanumeric",
        }),
        workerTimesheetColumns.accessor("totalHours", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Hours" />,
          cell: ({ row }) => (
            <div className="table-figure-stack">
              <TableFigure value={`${formatHours(row.original.totalHours)}h`} />
              <span className="table-person-detail">{workedDays(row.original.hours)}</span>
            </div>
          ),
          sortFn: "alphanumeric",
        }),
        workerTimesheetColumns.accessor((row) => row.comments ?? "", {
          id: "comments",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Comments" />,
          cell: ({ row }) => <TableLongText text={row.original.comments} title="Comments" />,
          sortFn: "text",
        }),
        workerTimesheetColumns.accessor("status", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }) => (
            <TableStatus
              label={statusLabel(row.original.status)}
              tone={
                row.original.status === "approved"
                  ? "success"
                  : row.original.status === "rejected"
                    ? "danger"
                    : row.original.status === "draft"
                      ? "draft"
                      : "warning"
              }
            />
          ),
          sortFn: "text",
        }),
        workerTimesheetColumns.accessor((row) => row.rejectionReason ?? "", {
          id: "rejectionReason",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Rejection reason" />,
          cell: ({ row }) => <TableLongText text={row.original.rejectionReason} title="Rejection reason" tone="danger" />,
          sortFn: "text",
        }),
      ]),
    [],
  );

  return (
    <AppDataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search by job site or week…"
      filters={[{ id: "status", label: "Status", value: (row) => statusLabel(row.status) }]}
      empty={{
        title: "No timesheets yet",
        description: "Submitted weeks will appear here once you log hours.",
      }}
    />
  );
}

// Returns the plain status label for a timesheet.
function statusLabel(status: TimesheetStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "draft") return "Draft";
  return "Pending";
}

// Shows the timesheet page for the signed-in worker.
export function WorkerTimesheetsPage() {
  return <WorkerTimesheetsPanel />;
}
