// Bulk checklist import: a `question` header column, or one question per line. Ids are always generated.
import type { ChecklistItem } from "./upload-api.ts";

// Splits CSV text into rows of fields, honouring quoted fields with commas, newlines and "" escapes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  rows.push(row);

  return rows.filter((fields) => fields.some((value) => value.trim() !== ""));
}

const CUSTOM_PREFIX = "custom-";

export const newChecklistId = () => `${CUSTOM_PREFIX}${crypto.randomUUID().slice(0, 8)}`;

// Custom questions are the ones added in the upload dialog (typed or imported), not backend defaults.
export const isCustomQuestion = (item: ChecklistItem) => item.id.startsWith(CUSTOM_PREFIX);

export function parseChecklistCsv(text: string): ChecklistItem[] {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  if (rows.length === 0) return [];

  const header = rows[0].map((name) => name.trim().toLowerCase());
  const questionCol = header.indexOf("question");
  const hasHeader = questionCol >= 0;
  const body = hasHeader ? rows.slice(1) : rows;

  return body
    .map((fields) => (hasHeader ? (fields[questionCol] ?? "") : fields.join(",")).trim())
    .filter((question) => question !== "")
    .map((question) => ({ id: newChecklistId(), question }));
}

// Appends imported items, skipping questions already present and re-keying clashing ids.
export function mergeChecklist(
  existing: ChecklistItem[],
  incoming: ChecklistItem[],
): ChecklistItem[] {
  const merged = [...existing];
  for (const item of incoming) {
    const key = item.question.toLowerCase();
    if (merged.some((other) => other.question.toLowerCase() === key)) continue;
    const id = merged.some((other) => other.id === item.id) ? newChecklistId() : item.id;
    merged.push({ id, question: item.question });
  }
  return merged;
}
