import { useQueries } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, ListFilter, Search } from "lucide-react";
import { useState } from "react";
import { Badge, type Tone } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  DEFAULT_DIRECTION,
  filterAndSortQueue,
  type QueueSortColumn,
  type SortDirection,
} from "../../data/review-queue-utils.ts";
import { getMediaAssetAnalysis } from "../../playback/playback-api.ts";
import { useMediaAssetList } from "../../playback/use-playback-url.ts";

/** Real media-asset ids are UUIDs from the backend; this prefix keeps them out of that space. */
const MEDIA_ID_PREFIX = "media:";

type ReviewRow = ReturnType<typeof useMediaAssetRows>[number];

/** A readable size for a recording that has no analysis yet. */
function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes)) return "";
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

type VerdictCounts = Partial<Record<string, number>>;

/** Verdict badge for a completed recording; is "Awaiting analysis" until the analysis result is in. */
function verdictOf(counts: VerdictCounts | undefined): {
  label: string;
  tone: Tone;
  priority: number;
} {
  if (!counts) return { label: "Awaiting analysis", tone: "info", priority: 2 };
  if (counts.FAIL) return { label: "High risk", tone: "risk", priority: 0 };
  if (counts.PARTIAL || counts.CANNOT_DETERMINE || counts.NOT_APPLICABLE || !counts.PASS) {
    return { label: "Needs review", tone: "watch", priority: 1 };
  }
  return { label: "Passed", tone: "good", priority: 3 };
}

function priorityOf(status: string, counts: VerdictCounts | undefined): number {
  if (status === "FAILED") return 0;
  return status === "COMPLETED" ? verdictOf(counts).priority : 2;
}

/** One row per uploaded recording; `assetStatus` is the backend's processing state. */
function useMediaAssetRows() {
  const { data: assets } = useMediaAssetList();
  const list = assets ?? [];
  // Same query key as the workspace, so opening a row reuses this cache.
  const analyses = useQueries({
    queries: list.map((asset) => ({
      queryKey: ["mediaAssetAnalysis", asset.id],
      queryFn: () => getMediaAssetAnalysis(asset.id),
      enabled: asset.status === "COMPLETED",
    })),
  });
  return list.map((asset, index) => ({
    counts: analyses[index]?.data?.result?.summary?.counts as VerdictCounts | undefined,
    id: `${MEDIA_ID_PREFIX}${asset.id}`,
    mediaAssetId: asset.id,
    assetStatus: asset.status,
    processingMode: asset.processingMode,
    title: asset.originalFilename,
    context: formatFileSize(asset.fileSizeBytes),
    createdAt: asset.createdAt,
    priority: priorityOf(asset.status, analyses[index]?.data?.result?.summary?.counts),
  }));
}

const COLUMNS: { key: QueueSortColumn | null; label: string; className?: string }[] = [
  { key: "name", label: "Call", className: "pl-5" },
  { key: "uploaded", label: "Uploaded" },
  { key: null, label: "Checklist" },
  { key: "status", label: "Status" },
];

// Left-edge rail colour per status tone, so urgency reads down the table at a glance.
const RAIL: Partial<Record<Tone, string>> = {
  risk: "shadow-[inset_3px_0_0_var(--red)]",
  watch: "shadow-[inset_3px_0_0_var(--amber)]",
  good: "shadow-[inset_3px_0_0_var(--green)]",
  info: "shadow-[inset_3px_0_0_var(--blue)]",
};

const STATUS_OPTIONS: { label: string; dot: string }[] = [
  { label: "High risk", dot: "bg-red" },
  { label: "Needs review", dot: "bg-amber" },
  { label: "Passed", dot: "bg-green" },
  { label: "Awaiting analysis", dot: "bg-blue" },
  { label: "Pending", dot: "bg-blue" },
  { label: "Queued for tonight", dot: "bg-blue" },
  { label: "Processing", dot: "bg-blue" },
  { label: "Failed", dot: "bg-red" },
];

function statusOf(row: ReviewRow): { label: string; tone: Tone } {
  switch (row.assetStatus) {
    case "COMPLETED":
      return verdictOf(row.counts);
    case "FAILED":
      return { label: "Failed", tone: "risk" };
    case "PENDING":
      return { label: "Pending", tone: "info" };
    case "QUEUED":
      return { label: "Queued for tonight", tone: "info" };
    case "PROCESSING":
      return { label: "Processing", tone: "info" };
    default: {
      const unhandled: never = row.assetStatus;
      throw new Error(`Unhandled media asset status: ${unhandled}`);
    }
  }
}

/** Batch items wait for the scheduled run while PENDING or QUEUED. */
const showsBatchNote = (row: ReviewRow) =>
  row.processingMode === "batch" && (row.assetStatus === "PENDING" || row.assetStatus === "QUEUED");

function UploadedAt({ value }: { value: string | undefined }) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return <span className="text-muted">No date</span>;
  return (
    <time dateTime={value} className="grid leading-tight tabular-nums">
      <span className="text-ink">
        {date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
      </span>
      <span className="text-[11px] text-muted">
        {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
      </span>
    </time>
  );
}

const RESULT_SEGMENTS = [
  { status: "PASS", label: "pass", bar: "bg-green", text: "text-green" },
  { status: "PARTIAL", label: "partial", bar: "bg-amber", text: "text-amber" },
  { status: "FAIL", label: "fail", bar: "bg-red", text: "text-red" },
  { status: "CANNOT_DETERMINE", label: "unclear", bar: "bg-amber", text: "text-amber" },
  { status: "NOT_APPLICABLE", label: "n/a", bar: "bg-line-strong", text: "text-muted" },
] as const;

/** Checklist verdict counts from the recording's analysis. */
function RecordingChecklist({ counts }: { counts: VerdictCounts | undefined }) {
  if (!counts) return <span className="text-[11px] text-muted">Analysis in progress…</span>;
  const segments = RESULT_SEGMENTS.map((segment) => ({
    ...segment,
    count: counts[segment.status] ?? 0,
  })).filter((segment) => segment.count > 0);
  const total = segments.reduce((sum, segment) => sum + segment.count, 0) || 1;
  return (
    <div className="grid w-40 gap-1.5">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
        {segments.map((segment) => (
          <span
            key={segment.status}
            className={segment.bar}
            style={{ width: `${(segment.count / total) * 100}%` }}
          />
        ))}
      </div>
      <span className="flex gap-2.5 text-[11px] font-semibold tabular-nums">
        {segments.map((segment) => (
          <span key={segment.status} className={segment.text}>
            {segment.count} {segment.label}
          </span>
        ))}
      </span>
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) {
    return (
      <ArrowUpDown
        className="size-3 opacity-0 transition-opacity group-hover:opacity-60"
        aria-hidden="true"
      />
    );
  }
  const Icon = direction === "asc" ? ArrowUp : ArrowDown;
  return <Icon className="size-3" aria-hidden="true" />;
}

/**
 * The queue of analysed calls plus the officer's own uploaded recordings that
 * have no analysis yet. Opening a mock row hands over its checklist and
 * transcript; opening a recording row hands over just its media asset id.
 */
export default function ReviewList({ onOpen }: { onOpen: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<QueueSortColumn>("uploaded");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const allRows = useMediaAssetRows().map((row) => ({
    ...row,
    statusLabel: statusOf(row).label,
  }));
  const rows = filterAndSortQueue(allRows, search, sortColumn, sortDirection, statuses);
  const narrowed = search.trim() !== "" || statuses.length > 0;

  const toggleStatus = (label: string, checked: boolean) =>
    setStatuses((current) =>
      checked ? [...current, label] : current.filter((other) => other !== label),
    );

  const clearAll = () => {
    setSearch("");
    setStatuses([]);
  };

  const handleSort = (column: QueueSortColumn) => {
    if (column === sortColumn) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection(DEFAULT_DIRECTION[column]);
    }
  };

  if (!allRows.length) return <p className="subtle">No analyses have been returned yet.</p>;

  return (
    <section
      aria-labelledby="review-queue-title"
      className="overflow-hidden rounded-[11px] border border-line-strong bg-card"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex items-baseline gap-2">
          <h2 id="review-queue-title" className="m-0 text-[13px] font-bold text-ink">
            Calls
          </h2>
          <span className="text-xs text-muted tabular-nums" aria-live="polite">
            {narrowed ? `${rows.length} of ${allRows.length}` : allRows.length}
          </span>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Search name, file or transcript"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8 bg-bg pl-8 text-xs md:text-xs"
              aria-label="Search the review queue"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 shrink-0 bg-card text-xs ${statuses.length > 0 ? "border-blue text-blue" : "text-ink"}`}
              >
                <ListFilter aria-hidden="true" />
                Filter
                {statuses.length > 0 && (
                  <span className="rounded-full bg-blue px-1.5 text-[10px] leading-4 font-bold text-white tabular-nums">
                    {statuses.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-[10.5px] font-bold tracking-[0.06em] text-muted uppercase">
                Status
              </DropdownMenuLabel>
              {STATUS_OPTIONS.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.label}
                  checked={statuses.includes(option.label)}
                  onCheckedChange={(checked) => toggleStatus(option.label, checked)}
                  onSelect={(event) => event.preventDefault()}
                  className="text-xs"
                >
                  <span className={`size-2 rounded-full ${option.dot}`} aria-hidden="true" />
                  {option.label}
                  <span className="ml-auto text-muted tabular-nums">
                    {allRows.filter((row) => row.statusLabel === option.label).length}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
              {statuses.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs text-blue" onSelect={() => setStatuses([])}>
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Table className="text-xs">
        <TableHeader className="bg-bg">
          <TableRow className="hover:bg-transparent">
            {COLUMNS.map(({ key, label, className }) => (
              <TableHead
                key={label}
                className={`h-9 px-3 text-[10.5px] font-bold tracking-[0.06em] text-muted uppercase ${className ?? ""}`}
                aria-sort={
                  key === sortColumn
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {key ? (
                  <button
                    type="button"
                    data-slot="sort-button"
                    className={`group inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 font-[inherit] tracking-[inherit] uppercase hover:text-ink ${key === sortColumn ? "text-ink" : "text-inherit"}`}
                    onClick={() => handleSort(key)}
                  >
                    {label}
                    <SortIcon active={key === sortColumn} direction={sortDirection} />
                  </button>
                ) : (
                  label
                )}
              </TableHead>
            ))}
            <TableHead className="w-10">
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="border-0 hover:bg-transparent">
              <TableCell colSpan={COLUMNS.length + 1} className="py-10 text-center">
                <p className="m-0 text-[13px] font-semibold text-ink">
                  {search.trim()
                    ? `No calls match "${search.trim()}"`
                    : "No calls with the selected status"}
                </p>
                <p className="mt-1 mb-3 text-xs text-muted">
                  Search covers call names, file names and transcript text.
                </p>
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear search and filters
                </Button>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const status = statusOf(row);
              return (
                <TableRow
                  key={row.id}
                  className="group/row cursor-pointer border-0 hover:bg-blue-soft/50"
                  onClick={() => onOpen(row.id)}
                >
                  <TableCell
                    className={`max-w-[380px] py-2.5 pr-3 pl-5 whitespace-normal ${RAIL[status.tone] ?? ""}`}
                  >
                    <button
                      type="button"
                      data-slot="row-link"
                      className="cursor-pointer border-0 bg-transparent p-0 text-left text-[13px] font-semibold text-ink hover:text-blue focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(row.id);
                      }}
                    >
                      {row.title}
                    </button>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {row.context}
                      {" · recording attached"}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <UploadedAt value={row.createdAt} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    {row.assetStatus === "COMPLETED" ? (
                      <RecordingChecklist counts={row.counts} />
                    ) : (
                      <span className="text-[11px] text-muted">
                        {row.assetStatus === "FAILED" ? "No result" : "Analysis in progress…"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <Badge variant={status.tone}>{status.label}</Badge>
                    {showsBatchNote(row) && (
                      <span className="mt-0.5 block text-[11px] text-muted">
                        Runs at 8pm SGT on weekdays
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="w-10 py-2.5 pr-4 text-right">
                    <ChevronRight
                      className="inline size-4 text-muted transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-ink motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </section>
  );
}
