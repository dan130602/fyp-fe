import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ObservabilityView,
  overrideImpact,
  percentage,
} from "../../components/observability/observability-dashboard.tsx";
import { emptyOverview, exampleOverview } from "./fixtures.ts";

describe("production observability", () => {
  it("keeps rates just below 100% distinguishable from perfect coverage", () => {
    expect(percentage((2099 / 2100) * 100)).toBe("99.95%");
    expect(percentage(100)).toBe("100%");
    expect(percentage((1 / 2100) * 100)).toBe("0.05%");
    expect(percentage(null)).toBe("—");
  });
  it("shows officer reference and separate all-breach detection denominators", () => {
    render(<ObservabilityView data={exampleOverview()} />);
    expect(screen.getAllByText(/not independent ground truth/).length).toBeGreaterThan(0);
    const coverage = screen.getByText("Decision coverage").closest(".obs-metric");
    expect(within(coverage as HTMLElement).getByText("99.95%")).toBeInTheDocument();
    expect(screen.getByText("389 / 390")).toBeInTheDocument();
    expect(screen.getAllByText("389 / 391").length).toBe(2);
    expect(
      screen.getByRole("table", { name: "AI and officer decision matrix" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Ground truth")).not.toBeInTheDocument();
  });
  it("does not turn an empty window into zero cost or perfect quality", () => {
    render(<ObservabilityView data={emptyOverview()} />);
    expect(screen.getByText(/No analyses in this window/)).toBeInTheDocument();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
    expect(screen.queryByText("US$0.00")).not.toBeInTheDocument();
    expect(screen.getByText("No verdict changes in this window.")).toBeInTheDocument();
  });
  it("distinguishes a failed attempt without checklist outcomes from an empty window", () => {
    const data = emptyOverview();
    data.counts.savedResults = 1;
    data.counts.failedResults = 1;
    data.counts.calls = 1;
    render(<ObservabilityView data={data} />);
    expect(screen.getByText(/1 saved AI results report a failure/)).toBeInTheDocument();
    expect(screen.getByText(/No checklist outcomes were available/)).toBeInTheDocument();
    expect(screen.queryByText(/No analyses in this window/)).not.toBeInTheDocument();
  });
  it("copies the existing backend override UUID without creating a new ID", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const data = exampleOverview();
    render(<ObservabilityView data={data} />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: `Copy override ID ${data.overrides.recent[0].id}` }),
      );
    });
    expect(writeText).toHaveBeenCalledWith(data.overrides.recent[0].id);
    expect(screen.getAllByText("False negative (FN)").length).toBeGreaterThan(0);
  });
  it("refreshes and changes the date window through callbacks", () => {
    const refresh = vi.fn(),
      change = vi.fn();
    render(
      <ObservabilityView data={exampleOverview()} onRefresh={refresh} onDaysChange={change} />,
    );
    fireEvent.change(screen.getByLabelText("Activity window"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Refresh production metrics" }));
    expect(change).toHaveBeenCalledWith(30);
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("classifies binary officer reversals separately from resolved unclear decisions and reverts", () => {
    expect(overrideImpact({ aiVerdict: "PASS", to: "FAIL", reverted: false })).toBe(
      "False negative (FN)",
    );
    expect(overrideImpact({ aiVerdict: "FAIL", to: "PASS", reverted: false })).toBe(
      "False positive (FP)",
    );
    expect(overrideImpact({ aiVerdict: "CANNOT_DETERMINE", to: "FAIL", reverted: false })).toBe(
      "Non-binary decision resolved",
    );
    expect(overrideImpact({ aiVerdict: "FAIL", to: "FAIL", reverted: true })).toBe(
      "Reverted to AI",
    );
  });
  it("labels the live officer matrix with the breach-positive FP/FN definitions", () => {
    render(<ObservabilityView data={exampleOverview()} />);
    expect(screen.getByText(/Live production records/)).toBeInTheDocument();
    const matrix = screen.getByRole("table", { name: "AI and officer decision matrix" });
    expect(within(matrix).getByText("False positive (FP)").closest("td")?.textContent).toContain(
      "2",
    );
    expect(within(matrix).getByText("False negative (FN)").closest("td")?.textContent).toContain(
      "1",
    );
    expect(screen.queryByText(/Synthetic UI preview/)).not.toBeInTheDocument();
  });
});
