import { describe, expect, it } from "vitest";
import { filterAndSortQueue, filterQueue, sortQueue } from "../review-queue-utils.ts";

const rows = [
  { title: "Wealth call 2", context: "12 questions", preview: "fees were explained", priority: 3 },
  { title: "Wealth call 10", context: "12 questions", preview: "no risk warning", priority: 0 },
  { title: "upload-b.mp3", context: "4.1 MB", priority: 2, createdAt: "2026-10-02T09:00:00" },
  { title: "Upload-a.mp3", context: "2.0 MB", priority: 2, createdAt: "2026-10-03T09:00:00" },
];
const titles = (list: { title: string }[]) => list.map((row) => row.title);

describe("filterQueue", () => {
  it("returns every row for a blank search", () => {
    expect(filterQueue(rows, "   ")).toBe(rows);
  });

  it("matches title, context and transcript preview, case-insensitively", () => {
    expect(titles(filterQueue(rows, "UPLOAD"))).toEqual(["upload-b.mp3", "Upload-a.mp3"]);
    expect(titles(filterQueue(rows, "4.1 mb"))).toEqual(["upload-b.mp3"]);
    expect(titles(filterQueue(rows, "risk warning"))).toEqual(["Wealth call 10"]);
  });
});

describe("filterQueue by status", () => {
  const withStatus = [
    { title: "A", context: "", priority: 0, statusLabel: "High risk" },
    { title: "B", context: "", priority: 3, statusLabel: "Clear" },
    { title: "C", context: "", priority: 2, statusLabel: "Awaiting analysis" },
  ];

  it("keeps only the selected statuses", () => {
    expect(titles(filterQueue(withStatus, "", ["High risk", "Clear"]))).toEqual(["A", "B"]);
  });

  it("combines the status filter with search", () => {
    expect(titles(filterQueue(withStatus, "c", ["Awaiting analysis", "Clear"]))).toEqual(["C"]);
  });
});

describe("sortQueue", () => {
  it("status ascending puts the most urgent first, then by name", () => {
    expect(titles(sortQueue(rows, "status", "asc"))).toEqual([
      "Wealth call 10",
      "Upload-a.mp3",
      "upload-b.mp3",
      "Wealth call 2",
    ]);
  });

  it("sorts names naturally and case-insensitively", () => {
    expect(titles(sortQueue(rows, "name", "asc"))).toEqual([
      "Upload-a.mp3",
      "upload-b.mp3",
      "Wealth call 2",
      "Wealth call 10",
    ]);
    expect(titles(sortQueue(rows, "name", "desc"))[0]).toBe("Wealth call 10");
  });

  it("orders by upload date with undated rows last in both directions", () => {
    expect(titles(sortQueue(rows, "uploaded", "desc")).slice(0, 2)).toEqual([
      "Upload-a.mp3",
      "upload-b.mp3",
    ]);
    expect(titles(sortQueue(rows, "uploaded", "asc")).slice(0, 2)).toEqual([
      "upload-b.mp3",
      "Upload-a.mp3",
    ]);
    expect(
      sortQueue(rows, "uploaded", "asc")
        .slice(2)
        .every((row) => !row.createdAt),
    ).toBe(true);
  });

  it("status descending puts the least urgent first", () => {
    expect(titles(sortQueue(rows, "status", "desc"))[0]).toBe("Wealth call 2");
  });

  it("does not mutate the input", () => {
    const before = titles(rows);
    sortQueue(rows, "name", "desc");
    expect(titles(rows)).toEqual(before);
  });
});

describe("filterAndSortQueue", () => {
  it("filters then sorts", () => {
    expect(titles(filterAndSortQueue(rows, "wealth", "status", "asc"))).toEqual([
      "Wealth call 10",
      "Wealth call 2",
    ]);
  });
});
