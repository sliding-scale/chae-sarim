"use client";

import { jobSiteSearchHref } from "@/lib/admin-search";
import { UserAvatar } from "@/components/users/UserAvatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FlexRender,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock3, Columns3, FileText, Funnel, MapPin, Search, XCircle, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { features, type DataTableFeatures } from "./data-table-features";

// Renders a sortable column title in the same weight as the other headers.
export function DataTableColumnHeader({
  column,
  title,
  align = "start",
}: {
  column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void };
  title: string;
  align?: "start" | "end";
}) {
  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      className={align === "end" ? "table-sort is-end" : "table-sort"}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {title}
      <Icon className={sorted ? "table-sort-icon" : "table-sort-icon is-idle"} aria-hidden="true" />
    </button>
  );
}

// Renders the leading identity cell: avatar, name, and a quieter second line.
export function TablePerson({
  name,
  detail,
  active = false,
}: {
  name: string;
  detail?: string | null;
  active?: boolean;
}) {
  return (
    <div className="table-person">
      <span className={active ? "table-avatar-wrap is-active" : "table-avatar-wrap"}>
        <UserAvatar name={name || "?"} />
      </span>
      <span className="table-person-copy">
        <span className="table-person-name">{name}</span>
        {detail ? <span className="table-person-detail">{detail}</span> : null}
      </span>
    </div>
  );
}

// Turns an email into the @handle shown under a person's name.
export function emailHandle(email: string) {
  const local = email.trim().split("@")[0];
  return local ? `@${local}` : null;
}

// Renders a secondary column in the muted body color.
export function TableMuted({ children }: { children: ReactNode }) {
  return <span className="table-muted">{children}</span>;
}

// Renders a muted value with a small icon, as in the admin review tables.
export function TableIconText({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="table-icon-text">
      <Icon size={16} aria-hidden="true" />
      {children}
    </span>
  );
}

// Links a job site name to the job sites list, already searched for that name.
export function TableJobSite({ name }: { name: string }) {
  return (
    <TableIconText icon={MapPin}>
      <Link href={jobSiteSearchHref(name)} aria-label={`Search job sites for ${name}`}>
        {name}
      </Link>
    </TableIconText>
  );
}

// Renders a status pill, with the icon used on the admin review tables.
export function TableStatus({
  label,
  tone = "default",
  marker = "icon",
}: {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "draft";
  marker?: "icon" | "dot";
}) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "danger" ? XCircle : tone === "warning" ? Clock3 : null;
  return (
    <div className="table-status-cell">
      <span className={tone === "default" ? "table-status" : `table-status is-${tone}`}>
        {marker === "dot" ? <i className="status-dot" aria-hidden="true" /> : Icon ? <Icon size={14} aria-hidden="true" /> : null}
        {label}
      </span>
    </div>
  );
}

// Renders a quiet dash for a cell with nothing in it.
export function TableEmptyValue() {
  return <span className="table-empty-value" aria-label="None">—</span>;
}

// Renders a plain place name, used where a site is the row's subject.
export function TableName({ children }: { children: ReactNode }) {
  return <span className="table-name">{children}</span>;
}

// Formats a YYYY-MM-DD range without repeating the month or year it shares, such as "12–18 Oct 2026".
export function formatDateRange(start: string, end: string) {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) return `${start} – ${end}`;
  const from = new Date(startYear, startMonth - 1, startDay);
  const to = new Date(endYear, endMonth - 1, endDay);
  const full = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (start === end) return full(from);
  if (startYear !== endYear) return `${full(from)} – ${full(to)}`;
  if (startMonth !== endMonth) {
    return `${from.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${full(to)}`;
  }
  return `${startDay}–${full(to)}`;
}

// Renders invoice files as pills, with a link when the file can be opened.
export function TableFiles({ files }: { files: { fileName: string; url: string | null }[] }) {
  if (files.length === 0) return <TableMuted>No file</TableMuted>;
  return (
    <span className="file-links">
      {files.map((file, index) =>
        file.url ? (
          <a key={`${file.fileName}-${index}`} className="file-pill" href={file.url} target="_blank" rel="noreferrer">
            <FileText size={14} aria-hidden="true" />
            {file.fileName}
          </a>
        ) : (
          <span key={`${file.fileName}-${index}`} className="file-pill">
            <FileText size={14} aria-hidden="true" />
            {file.fileName}
          </span>
        ),
      )}
    </span>
  );
}

// Shows long text cut to two lines, with a Read more link that opens the whole text when it does not fit.
export function TableLongText({
  text,
  title,
  tone,
}: {
  text: string | null | undefined;
  title: string;
  tone?: "danger";
}) {
  const value = text?.trim() ?? "";
  const copyRef = useRef<HTMLSpanElement>(null);
  const [clipped, setClipped] = useState(false);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const copy = copyRef.current;
    if (!copy) return;
    const measure = () => setClipped(copy.scrollHeight > copy.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(copy);
    return () => observer.disconnect();
  }, [value]);

  if (!value) return <TableEmptyValue />;
  return (
    <div className={tone === "danger" ? "table-long-text is-danger" : "table-long-text"}>
      <span ref={copyRef} className="table-long-text-copy">
        {value}
      </span>
      {clipped ? (
        <button type="button" className="table-read-more" onClick={() => setOpen(true)}>
          Read more
        </button>
      ) : null}
      {open ? <TableTextDialog title={title} text={value} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

// Opens the full text of a table cell above the page, closing from the button, Escape, or the backdrop.
function TableTextDialog({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="saas-card confirm-dialog table-text-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="panel-title">
          {title}
        </h2>
        <p className="panel-copy table-text-dialog-body">{text}</p>
        <div className="confirm-actions">
          <button ref={closeRef} type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

// Renders a right-aligned number. Negative values use the danger color.
export function TableFigure({ value, negative = false }: { value: string; negative?: boolean }) {
  return <span className={negative ? "table-figure is-negative" : "table-figure"}>{value}</span>;
}

// Describes one dropdown filter, such as Status, using a value read from each row.
export type TableFacet<TData> = {
  id: string;
  label: string;
  value: (row: TData) => string;
  values?: (row: TData) => string[];
};

const columnLabels: Record<string, string> = {
  name: "Name",
  email: "Email",
  jobSites: "Job sites",
  status: "Status",
  role: "Role",
  address: "Address",
  workers: "Assigned Workers",
  worker: "Worker",
  jobSiteName: "Job Site",
  weekStart: "Week",
  totalHours: "Hours",
  comments: "Comments",
  invoiceMonth: "Month",
  amount: "Amount (PKR)",
  files: "Files",
  startDate: "Dates",
  reason: "Reason",
  rejectionReason: "Rejection reason",
};

const pageSizes = [10, 20, 30, 50];

// Reads a short title for a column in the View menu.
function columnTitle(id: string) {
  return columnLabels[id] ?? id.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

// Opens a small checkbox menu from a toolbar button.
function ToolbarMenu({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="table-menu" ref={rootRef}>
      <button type="button" className="table-tool" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((current) => !current)}>
        {icon}
        {label}
      </button>
      {open ? <div className="table-menu-panel">{children}</div> : null}
    </div>
  );
}

// Lists the choices for one toolbar filter, skipping blanks.
function facetOptions<TData>(data: TData[], filter: TableFacet<TData>) {
  return [
    ...new Set(data.flatMap((row) => (filter.values ? filter.values(row) : [filter.value(row)])).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
}

// Shows about eight choices, then scrolls the rest so a long job site list stays in the menu.
function FacetChoices({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  const choices = options.map((option) => (
    <label key={option} className="table-menu-option">
      <input type="checkbox" checked={selected.includes(option)} onChange={() => onToggle(option)} />
      <span>{option}</span>
    </label>
  ));
  if (options.length <= 8) return choices;
  return <div className="table-menu-scroll">{choices}</div>;
}

// Shows the shared empty-table illustration: a sheet, a title, and a short note.
function TableEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="table-empty-art">
      <span className="table-empty-sheet" aria-hidden="true">
        <FileText />
        <i>✦</i>
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

// Renders a searchable, sortable, paginated table for a sidebar list.
export function AppDataTable<TData extends RowData>({
  columns,
  data,
  searchPlaceholder,
  initialSearch = "",
  initialFacets = {},
  filters = [],
  empty,
}: {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  searchPlaceholder: string;
  initialSearch?: string;
  initialFacets?: Record<string, string[]>;
  filters?: TableFacet<TData>[];
  empty?: { title: string; description: string };
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState(initialSearch);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [facets, setFacets] = useState<Record<string, string[]>>(initialFacets);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const filtered = useMemo(() => {
    const active = filtersRef.current.filter((filter) => (facets[filter.id] ?? []).length > 0);
    if (active.length === 0) return data;
    return data.filter((row) =>
      active.every((filter) => {
        const selected = facets[filter.id] ?? [];
        if (filter.values) return selected.some((option) => filter.values?.(row).includes(option));
        return selected.includes(filter.value(row));
      }),
    );
  }, [data, facets]);

  const table = useTable({
    features,
    data: filtered,
    columns,
    globalFilterFn: "includesString",
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, globalFilter, pagination, columnVisibility },
  });

  const total = table.getRowCount();
  const { pageIndex, pageSize } = table.state.pagination;
  const start = total === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(total, (pageIndex + 1) * pageSize);
  const viewColumns = table.getAllLeafColumns().filter((column) => column.id !== "actions" && column.getCanHide());
  const filterCount = Object.values(facets).reduce((count, selected) => count + selected.length, 0);

  // Toggles one option inside a toolbar filter and returns to the first page.
  function toggleFacet(id: string, option: string) {
    setFacets((current) => {
      const selected = current[id] ?? [];
      const next = selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option];
      return { ...current, [id]: next };
    });
    table.setPageIndex(0);
  }

  return (
    <div className="app-table-wrap">
      <div className="app-table-toolbar">
        <label className="app-table-search">
          <Search size={16} aria-hidden="true" />
          <input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(event) => {
              table.setGlobalFilter(event.target.value);
              table.setPageIndex(0);
            }}
          />
        </label>
        {filters.length > 1 ? (
          <ToolbarMenu
            label={filterCount > 0 ? `Filter ${filterCount}` : "Filter"}
            icon={<Funnel size={15} aria-hidden="true" />}
          >
            {filters.map((filter) => {
              const selected = facets[filter.id] ?? [];
              const options = facetOptions(data, filter);
              return (
                <div key={filter.id} className="table-menu-group">
                  <p className="table-menu-heading">{filter.label}</p>
                  {options.length === 0 ? (
                    <p className="table-menu-empty">Nothing to filter</p>
                  ) : (
                    <FacetChoices
                      options={options}
                      selected={selected}
                      onToggle={(option) => toggleFacet(filter.id, option)}
                    />
                  )}
                </div>
              );
            })}
            {filterCount > 0 ? (
              <button type="button" className="table-menu-clear" onClick={() => setFacets({})}>
                Clear
              </button>
            ) : null}
          </ToolbarMenu>
        ) : (
          filters.map((filter) => {
            const selected = facets[filter.id] ?? [];
            const options = facetOptions(data, filter);
            const label = selected.length > 0 ? `${filter.label} ${selected.length}` : filter.label;
            return (
              <ToolbarMenu key={filter.id} label={label} icon={<Funnel size={15} aria-hidden="true" />}>
                {options.length === 0 ? (
                  <p className="table-menu-empty">Nothing to filter</p>
                ) : (
                  <FacetChoices
                    options={options}
                    selected={selected}
                    onToggle={(option) => toggleFacet(filter.id, option)}
                  />
                )}
                {selected.length > 0 ? (
                  <button type="button" className="table-menu-clear" onClick={() => setFacets((current) => ({ ...current, [filter.id]: [] }))}>
                    Clear
                  </button>
                ) : null}
              </ToolbarMenu>
            );
          })
        )}
        <ToolbarMenu label="View" icon={<Columns3 size={15} aria-hidden="true" />}>
          {viewColumns.map((column) => (
            <label key={column.id} className="table-menu-option">
              <input type="checkbox" checked={column.getIsVisible()} onChange={() => column.toggleVisibility()} />
              <span>{columnTitle(column.id)}</span>
            </label>
          ))}
        </ToolbarMenu>
      </div>
      <div className="app-table-frame">
        <Table className="app-table">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-[var(--color-border)] hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={header.column.id === "amount" ? "is-numeric" : undefined}>
                    {header.isPlaceholder ? null : <FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.id === "amount" ? "is-numeric" : undefined}>
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={Math.max(table.getVisibleLeafColumns().length, 1)} className="app-table-empty">
                  <TableEmpty
                    title={data.length === 0 && empty ? empty.title : "No results"}
                    description={
                      data.length === 0 && empty
                        ? empty.description
                        : "Try a different search or filter."
                    }
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="app-table-pager">
        <label className="table-page-size">
          Rows per page
          <select
            value={pageSize}
            onChange={(event) => {
              table.setPageSize(Number(event.target.value));
              table.setPageIndex(0);
            }}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="app-table-pager-actions">
          <p>
            {start}–{end} of {total}
            {" · "}
            Page {total === 0 ? 0 : pageIndex + 1} of {Math.max(table.getPageCount(), total === 0 ? 0 : 1)}
          </p>
          <button type="button" className="table-page-btn" aria-label="First page" onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronsLeft size={16} />
          </button>
          <button type="button" className="table-page-btn" aria-label="Previous page" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft size={16} />
          </button>
          <span className="table-page-btn is-current" aria-current="page">
            {pageIndex + 1}
          </span>
          <button type="button" className="table-page-btn" aria-label="Next page" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight size={16} />
          </button>
          <button type="button" className="table-page-btn" aria-label="Last page" onClick={() => table.lastPage()} disabled={!table.getCanNextPage()}>
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
