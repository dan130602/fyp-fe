import { describe, expect, it } from "vitest";
import type { Advisor } from "../advisors-api.ts";
import { filterAdvisors } from "../filter-advisors.ts";

const advisor = (employeeId: string, fullName: string): Advisor => ({
  id: employeeId,
  employeeId,
  fullName,
  email: `${employeeId}@clearcall-bank.example`,
  department: "Private Banking",
});

const ADVISORS = [advisor("E100001", "Hugh Mungus"), advisor("E100002", "Phua Chiu Cheng")];

describe("filterAdvisors", () => {
  it("returns everyone for a blank search", () => {
    expect(filterAdvisors(ADVISORS, "  ")).toEqual(ADVISORS);
  });

  it("matches on employee ID, case-insensitively", () => {
    expect(filterAdvisors(ADVISORS, "e100002")).toEqual([ADVISORS[1]]);
  });

  it("matches on part of the name", () => {
    expect(filterAdvisors(ADVISORS, "mung")).toEqual([ADVISORS[0]]);
  });

  it("returns nothing when no advisor matches", () => {
    expect(filterAdvisors(ADVISORS, "nobody")).toEqual([]);
  });
});
