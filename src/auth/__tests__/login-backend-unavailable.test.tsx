import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TopNav from "../../components/shared/top-nav.tsx";
import { apiGet } from "../../lib/api-client.ts";
import Login from "../../views/login.jsx";
import { AuthProvider } from "../auth-context.tsx";
import { getCurrentSession, signIn, signOut } from "../cognito-auth.ts";

vi.mock("../cognito-auth.ts", () => ({
  getCurrentSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("../../lib/api-client.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/api-client.ts")>()),
  apiGet: vi.fn(),
}));

function ProductionDestination() {
  const location = useLocation();
  return <div>Production dashboard {location.search}</div>;
}

function renderLogin(initialEntry = "/login") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/developer"
              element={
                <>
                  <TopNav />
                  <ProductionDestination />
                </>
              }
            />
            <Route path="/management" element={<div>Administrator home</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentSession).mockResolvedValue({
    username: "admin-test",
    name: "Administrator",
    initials: "AD",
  });
  vi.mocked(apiGet).mockRejectedValue(new TypeError("Failed to fetch"));
});

describe("login when the backend is unavailable", () => {
  it("shows progress and then a recoverable error instead of redirecting to itself", async () => {
    renderLogin();
    expect(screen.getByRole("status")).toHaveTextContent("Checking your sign-in");
    expect(await screen.findByRole("alert")).toHaveTextContent("Your session is still active");
    expect(screen.getByRole("button", { name: "Retry account check" })).toBeEnabled();
    expect(signOut).not.toHaveBeenCalled();
    expect(screen.queryByText("Administrator home")).not.toBeInTheDocument();
  });

  it("retries the backend lookup and navigates only after it supplies a role", async () => {
    renderLogin();
    await screen.findByRole("alert");
    vi.mocked(apiGet).mockResolvedValue({ id: "test-admin", role: "ADMIN", status: "ACTIVE" });
    fireEvent.click(screen.getByRole("button", { name: "Retry account check" }));
    expect(await screen.findByText("Administrator home")).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("allows signing out while the backend is offline", async () => {
    renderLogin();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(signOut).toHaveBeenCalledOnce();
  });
});

describe("production sign-in navigation", () => {
  it("signs out from production directly to the login form", async () => {
    vi.mocked(apiGet).mockResolvedValue({
      id: "developer-test",
      role: "DEVELOPER",
      status: "ACTIVE",
    });
    renderLogin("/developer?tab=production");
    const signOutButton = await screen.findByRole("button", { name: "Sign out" });
    fireEvent.click(signOutButton);
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText("Production dashboard ?tab=production")).not.toBeInTheDocument();
    expect(signOut).toHaveBeenCalledOnce();
  });
  it("routes a new developer sign-in directly to production without manual navigation", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);
    vi.mocked(signIn).mockResolvedValue({
      ok: true,
      user: { username: "developer-test", name: "Developer", initials: "DE" },
    });
    vi.mocked(apiGet).mockResolvedValue({
      id: "developer-test",
      role: "DEVELOPER",
      status: "ACTIVE",
    });
    renderLogin();
    await screen.findByRole("heading", { name: "Sign in" });
    fireEvent.change(screen.getByLabelText("Username or email"), {
      target: { value: "developer-test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "test-only-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Production dashboard ?tab=production")).toBeInTheDocument();
    expect(screen.queryByText("Administrator home")).not.toBeInTheDocument();
  });

  it("restores an existing developer session to the production home", async () => {
    vi.mocked(apiGet).mockResolvedValue({
      id: "developer-test",
      role: "DEVELOPER",
      status: "ACTIVE",
    });
    renderLogin();
    expect(await screen.findByText("Production dashboard ?tab=production")).toBeInTheDocument();
  });

  it("returns a reporting administrator to production after the panel sign-in link", async () => {
    vi.mocked(apiGet).mockResolvedValue({ id: "admin-test", role: "ADMIN", status: "ACTIVE" });
    renderLogin("/login?next=production");
    expect(await screen.findByText("Production dashboard ?tab=production")).toBeInTheDocument();
  });
});
