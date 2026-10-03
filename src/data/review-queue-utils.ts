// Pure client-side search, status filter and sort over the review queue. GET /api/media-assets has no pagination.

export interface QueueRow {
  title: string;
  context: string;
  preview?: string;
  priority: number; // lower is more urgent
  createdAt?: string; // ISO timestamp; analysed mock calls have none
  statusLabel?: string;
}

export type QueueSortColumn = "name" | "uploaded" | "status";
export type SortDirection = "asc" | "desc";

// Direction a column starts in when first clicked.
export const DEFAULT_DIRECTION: Record<QueueSortColumn, SortDirection> = {
  name: "asc",
  uploaded: "desc",
  status: "asc",
};

// An empty status list means no status filter.
export function filterQueue<T extends QueueRow>(
  rows: T[],
  search: string,
  statuses: readonly string[] = [],
): T[] {
  const query = search.trim().toLowerCase();
  if (!query && statuses.length === 0) return rows;
  return rows.filter(
    (row) =>
      (statuses.length === 0 || statuses.includes(row.statusLabel ?? "")) &&
      [row.title, row.context, row.preview ?? ""].some((text) =>
        text.toLowerCase().includes(query),
      ),
  );
}

const byName = (a: QueueRow, b: QueueRow) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true });

function compare(a: QueueRow, b: QueueRow, column: QueueSortColumn): number {
  if (column === "name") return byName(a, b);
  if (column === "status") return a.priority - b.priority;
  return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
}

// Undated rows sort last whichever way the upload column points; ties fall back to name A–Z.
export function sortQueue<T extends QueueRow>(
  rows: T[],
  column: QueueSortColumn,
  direction: SortDirection,
): T[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (column === "uploaded" && Boolean(a.createdAt) !== Boolean(b.createdAt)) {
      return a.createdAt ? -1 : 1;
    }
    return sign * compare(a, b, column) || byName(a, b);
  });
}

export function filterAndSortQueue<T extends QueueRow>(
  rows: T[],
  search: string,
  column: QueueSortColumn,
  direction: SortDirection,
  statuses: readonly string[] = [],
): T[] {
  return sortQueue(filterQueue(rows, search, statuses), column, direction);
}
