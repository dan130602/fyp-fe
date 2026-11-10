import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProductionPanel from "../../components/developer/production-panel.jsx";
import { ApiError } from "../../lib/api-client.ts";
import Management from "../../views/management.jsx";

const state = vi.hoisted(() => ({
  role: null as string | null,
  loading: false,
  isAuthenticated: false,
  backendRole: null as string | null,
  profilePending: false,
  profileError: null as Error | null,
}));
const retry = vi.hoisted(() => vi.fn());
vi.mock("../../auth/auth-context.tsx", () => ({ useAuth: () => state }));
vi.mock("../../auth/current-user.ts", () => ({
  useCurrentUser: () => ({
    data: state.backendRole ? { role: state.backendRole } : undefined,
    isPending: state.profilePending,
    isError: Boolean(state.profileError),
    error: state.profileError,
    refetch: retry,
    isFetching: false,
  }),
}));
vi.mock("../../components/observability/observability-dashboard.tsx", () => ({
  default: () => <div>Live production dashboard</div>,
}));
describe("production data access from the public developer route", () => {
  beforeEach(() => {
    state.role = null;
    state.loading = false;
    state.isAuthenticated = false;
    state.backendRole = null;
    state.profilePending = false;
    state.profileError = null;
    retry.mockClear();
  });
  it("does not mount the data-fetching dashboard for an anonymous visitor", () => {
    render(<ProductionPanel />);
    expect(screen.queryByText("Live production dashboard")).not.toBeInTheDocument();
    expect(screen.getByText("Sign in to view production observability")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in to view dashboard" })).toHaveAttribute(
      "href", "/login?next=production",
    );
  });
  it("does not mount it for an officer", () => {
    state.role = "COMPLIANCE_OFFICER";
    state.isAuthenticated = true;
    state.backendRole = "COMPLIANCE_OFFICER";
    render(<ProductionPanel />);
    expect(screen.queryByText("Live production dashboard")).not.toBeInTheDocument();
    expect(screen.getByText("Production reporting access required")).toBeInTheDocument();
    expect(screen.getByText("COMPLIANCE_OFFICER")).toBeInTheDocument();
  });
  it("waits for authentication to settle", () => {
    state.loading = true;
    render(<ProductionPanel />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Live production dashboard")).not.toBeInTheDocument();
  });
  it("mounts it for an administrator", () => {
    state.role = "ADMIN";
    state.isAuthenticated = true;
    render(<ProductionPanel />);
    expect(screen.getByText("Live production dashboard")).toBeInTheDocument();
  });
  it("recognizes backend super administrators within the developer panel without changing global routing", () => {
    state.role = "COMPLIANCE_OFFICER";
    state.isAuthenticated = true;
    state.backendRole = "SUPER_ADMIN";
    render(<ProductionPanel />);
    expect(screen.getByText("Live production dashboard")).toBeInTheDocument();
  });
  it("keeps management independent of the production dashboard", () => {
    render(<Management />);
    expect(screen.getByRole("heading", { name: "Management overview" })).toBeInTheDocument();
    expect(screen.queryByText("Live production dashboard")).not.toBeInTheDocument();
  });
  it("accepts an authenticated developer from the backend without granting an administrator role", () => {
    state.role = "COMPLIANCE_OFFICER";
    state.isAuthenticated = true;
    state.backendRole = "DEVELOPER";
    render(<ProductionPanel />);
    expect(screen.getByText("Live production dashboard")).toBeInTheDocument();
  });
  it("does not use a cached developer profile after logout", () => {
    state.backendRole = "DEVELOPER";
    render(<ProductionPanel />);
    expect(screen.queryByText("Live production dashboard")).not.toBeInTheDocument();
  });
  it("does not grant access using a cached administrator profile after logout", () => {
    state.backendRole = "SUPER_ADMIN";
    render(<ProductionPanel />);
    expect(screen.queryByText("Live production dashboard")).not.toBeInTheDocument();
  });
  it("accepts the manager role returned by the live backend without changing global role mapping", () => {
    state.isAuthenticated = true;
    state.backendRole = "MANAGER";
    render(<ProductionPanel />);
    expect(screen.getByText("Live production dashboard")).toBeInTheDocument();
  });
  it("waits for the account lookup instead of showing a misleading role denial", () => {
    state.isAuthenticated = true;
    state.profilePending = true;
    render(<ProductionPanel />);
    expect(screen.getByText("Checking production access...")).toBeInTheDocument();
    expect(screen.queryByText("Production reporting access required")).not.toBeInTheDocument();
  });
  it("distinguishes a backend lookup failure from a missing session or role", () => {
    state.isAuthenticated = true;
    state.profileError = new ApiError(503, "unavailable");
    render(<ProductionPanel />);
    expect(screen.getByRole("alert")).toHaveTextContent("HTTP 503");
    expect(screen.queryByText("Sign in to view production observability")).not.toBeInTheDocument();
    expect(screen.queryByText("Live production dashboard")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry access check" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
