import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import InternalDeveloper from "../../views/internal-developer.jsx";

vi.mock("../../components/developer/production-panel.jsx", () => ({
  default: () => <div>Live system metrics</div>,
}));
vi.mock("../../components/developer/ablation-table.jsx", () => ({
  default: () => <div>Offline experiment comparison</div>,
}));
vi.mock("../../data/ablation-runs.js", () => ({
  useAblationRuns: () => ({
    runs: [],
    live: null,
    nextVersion: "test",
    patchRun: vi.fn(),
    promoteRun: vi.fn(),
  }),
  useMetricGroups: () => [],
  useConfigKnobs: () => [],
  useChecklistQuestions: () => [],
  useEvalDataset: () => ({ name: "test fixture", items: 0, shape: "test" }),
}));
describe("developer production entry point", () => {
  it("opens live metrics directly without displaying the offline comparison", () => {
    render(
      <MemoryRouter initialEntries={["/developer?tab=production"]}>
        <InternalDeveloper />
      </MemoryRouter>,
    );
    expect(screen.getByText("Live system metrics")).toBeInTheDocument();
    expect(screen.queryByText("Offline experiment comparison")).not.toBeInTheDocument();
  });
  it("keeps the existing experiment tab separate from production metrics", () => {
    render(
      <MemoryRouter initialEntries={["/developer"]}>
        <InternalDeveloper />
      </MemoryRouter>,
    );
    expect(screen.getByText("Offline experiment comparison")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Production" }));
    expect(screen.getByText("Live system metrics")).toBeInTheDocument();
    expect(screen.queryByText("Offline experiment comparison")).not.toBeInTheDocument();
  });
});
