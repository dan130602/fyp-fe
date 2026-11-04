import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ObservabilityDashboard from "../../components/observability/observability-dashboard.tsx";
import { ApiError } from "../../lib/api-client.ts";

const state = vi.hoisted(() => ({ error: new Error("unavailable"), isPending: false }));
vi.mock("../use-observability.ts", () => ({
  useObservability: () => ({
    isPending: state.isPending,
    isError: !state.isPending,
    error: state.error,
    data: undefined,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));
describe("live production dashboard availability", () => {
  beforeEach(() => {
    state.error = new Error("unavailable");
    state.isPending = false;
  });
  it("shows a backend error instead of sample cost, latency or accuracy", () => {
    render(<ObservabilityDashboard />);
    expect(screen.getByText("Production metrics unavailable")).toBeInTheDocument();
    expect(screen.queryByText("US$7.42")).not.toBeInTheDocument();
    expect(screen.queryByText("99.95%")).not.toBeInTheDocument();
  });
  it("identifies a backend missing the production reporting endpoint", () => {
    state.error = new ApiError(404, "not found");
    render(<ObservabilityDashboard />);
    expect(
      screen.getByText(/Deploy the matching read-only reporting endpoint/),
    ).toBeInTheDocument();
  });
  it("waits for live records without rendering fixture values", () => {
    state.isPending = true;
    render(<ObservabilityDashboard />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("US$7.42")).not.toBeInTheDocument();
  });
});
