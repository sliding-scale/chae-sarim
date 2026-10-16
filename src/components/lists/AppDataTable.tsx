"use client";

import { UserAvatar } from "@/components/users/UserAvatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FlexRender,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Columns3, Funnel, ListFilter } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  const Icon = sorted === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      className={align === "end" ? "table-sort is-end" : "table-sort"}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {title}
      {sorted ? <Icon className="table-sort-icon" aria-hidden="true" /> : null}
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

// Renders a status as plain text, with an optional note underneath.
export function TableStatus({
  label,
  detail,
  tone = "default",
}: {
  label: string;
  detail?: string | null;
  tone?: "default" | "danger";
}) {
  return (
    <div className="table-status-cell">
      <span className={tone === "danger" ? "table-status is-danger" : "table-status"}>{label}</span>
      {detail ? <span className="table-person-detail">{detail}</span> : null}
    </div>
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
};

const columnLabels: Record<string, string> = {
  name: "Name",
  email: "Email",
  jobSites: "Job sites",
  status: "Status",
  role: "Role",
  address: "Address",
  worker: "Worker",
  jobSiteName: "Job site",
  weekStart: "Week",
  totalHours: "Hours",
  comments: "Comments",
  invoiceMonth: "Month",
  amount: "Amount",
  files: "Files",
  startDate: "Dates",
  reason: "Reason",
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

// Renders a searchable, sortable, paginated table for a sidebar list.
export function AppDataTable<TData extends RowData>({
  columns,
  data,
  searchPlaceholder,
  filters = [],
}: {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  searchPlaceholder: string;
  filters?: TableFacet<TData>[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [facets, setFacets] = useState<Record<string, string[]>>({});
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const filtered = useMemo(() => {
    const active = filtersRef.current.filter((filter) => (facets[filter.id] ?? []).length > 0);
    if (active.length === 0) return data;
    return data.filter((row) => active.every((filter) => (facets[filter.id] ?? []).includes(filter.value(row))));
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
          <ListFilter size={15} aria-hidden="true" />
          <input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(event) => {
              table.setGlobalFilter(event.target.value);
              table.setPageIndex(0);
            }}
          />
        </label>
        {filters.map((filter) => {
          const selected = facets[filter.id] ?? [];
          const options = [...new Set(data.map((row) => filter.value(row)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
          const label = selected.length > 0 ? `${filter.label} ${selected.length}` : filter.label;
          return (
            <ToolbarMenu key={filter.id} label={label} icon={<Funnel size={15} aria-hidden="true" />}>
              {options.length === 0 ? (
                <p className="table-menu-empty">Nothing to filter</p>
              ) : (
                options.map((option) => (
                  <label key={option} className="table-menu-option">
                    <input
                      type="checkbox"
                      checked={selected.includes(option)}
                      onChange={() => toggleFacet(filter.id, option)}
                    />
                    <span>{option}</span>
                  </label>
                ))
              )}
              {selected.length > 0 ? (
                <button type="button" className="table-menu-clear" onClick={() => setFacets((current) => ({ ...current, [filter.id]: [] }))}>
                  Clear
                </button>
              ) : null}
            </ToolbarMenu>
          );
        })}
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
                  <TableHead key={header.id}>
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
                    <TableCell key={cell.id}>
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={Math.max(table.getVisibleLeafColumns().length, 1)} className="app-table-empty">
                  No results.
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
            aria-label="Rows per page"
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
          </p>
          <button type="button" className="table-page-btn" aria-label="First page" onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronsLeft size={16} />
          </button>
          <button type="button" className="table-page-btn" aria-label="Previous page" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft size={16} />
          </button>
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
