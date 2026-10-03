import { describe, expect, it } from "vitest";
import template from "../../../public/checklist-template.csv?raw";
import {
  isCustomQuestion,
  mergeChecklist,
  newChecklistId,
  parseChecklistCsv,
  parseCsv,
} from "../parse-checklist-csv.ts";

describe("parseCsv", () => {
  it("handles quoted commas, escaped quotes, newlines and CRLF", () => {
    expect(parseCsv('a,"b, c"\r\n"say ""hi""","line\nbreak"\n')).toEqual([
      ["a", "b, c"],
      ['say "hi"', "line\nbreak"],
    ]);
  });

  it("drops blank rows", () => {
    expect(parseCsv("a\n\n , \nb")).toEqual([["a"], ["b"]]);
  });
});

describe("parseChecklistCsv", () => {
  it("reads the question column by header, ignoring other columns and their ids", () => {
    const items = parseChecklistCsv('id,question\nF1,"Was the fee, in full, disclosed?"\n');
    expect(items.map((item) => item.question)).toEqual(["Was the fee, in full, disclosed?"]);
    expect(items[0].id).toMatch(/^custom-/);
  });

  it("parses the shipped template", () => {
    expect(parseChecklistCsv(template)).toHaveLength(2);
  });

  it("treats headerless input as one question per line, keeping unquoted commas", () => {
    const items = parseChecklistCsv("﻿Was consent given, and recorded?\nWas the client identified?");
    expect(items.map((item) => item.question)).toEqual([
      "Was consent given, and recorded?",
      "Was the client identified?",
    ]);
  });

  it("skips rows with an empty question", () => {
    expect(parseChecklistCsv("id,question\nK1,\nK2,  \n")).toEqual([]);
  });
});

describe("mergeChecklist", () => {
  const existing = [{ id: "K01", question: "Was identity verified?" }];

  it("skips questions already present, case-insensitively", () => {
    expect(mergeChecklist(existing, [{ id: "X", question: "was IDENTITY verified?" }])).toEqual(
      existing,
    );
  });

  it("re-keys an imported item whose id clashes", () => {
    const merged = mergeChecklist(existing, [{ id: "K01", question: "Were fees explained?" }]);
    expect(merged).toHaveLength(2);
    expect(merged[1].id).not.toBe("K01");
    expect(merged[1].question).toBe("Were fees explained?");
  });
});

describe("isCustomQuestion", () => {
  it("flags generated ids as custom and backend ids as default", () => {
    expect(isCustomQuestion({ id: newChecklistId(), question: "Q" })).toBe(true);
    expect(isCustomQuestion({ id: "K01", question: "Q" })).toBe(false);
  });
});
