import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "../../lib/query-client.ts";
import { AuthProvider, useAuth } from "../auth-context.tsx";
import type { AuthUser, LoginResult } from "../roles.ts";
import { ROLES } from "../roles.ts";

vi.mock("../cognito-auth.ts", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentSession: vi.fn(),
  getIdToken: vi.fn(),
}));

const cognitoAuth = await import("../cognito-auth.ts");
const mockSignIn = vi.mocked(cognitoAuth.signIn);
const mockSignOut = vi.mocked(cognitoAuth.signOut);
const mockGetCurrentSession = vi.mocked(cognitoAuth.getCurrentSession);
const mockGetIdToken = vi.mocked(cognitoAuth.getIdToken);

const officerIdentity: AuthUser = { username: "officer-a", name: "Officer A", initials: "OA" };
const adminIdentity: AuthUser = { username: "admin-b", name: "Admin B", initials: "AB" };

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** Reads useAuth() and renders enough to assert on role/name across sign-in/out transitions. */
function Probe() {
  const { role, user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="role">{role ?? "none"}</span>
      <span data-testid="name">{user?.name ?? "none"}</span>
      <button type="button" onClick={() => void login("ignored", "ignored")}>
        login
      </button>
      <button type="button" onClick={() => logout()}>
        logout
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // The queryClient is a module singleton shared across tests; clear it so cached /me
  // responses from one test can't leak into the next the same way the bug let A leak into B.
  queryClient.clear();
  mockSignIn.mockReset();
  mockSignOut.mockReset();
  mockGetCurrentSession.mockReset();
  mockGetIdToken.mockReset();
  mockGetCurrentSession.mockResolvedValue(null);
  mockGetIdToken.mockResolvedValue("token");
  vi.stubGlobal("fetch", vi.fn());
});

describe("logout clears the cached /me response", () => {
  it("does not leak user A's role into user B signing in within the staleTime window", async () => {
    mockSignIn.mockResolvedValueOnce({ ok: true, user: officerIdentity } satisfies LoginResult);
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        id: "a",
        email: "a@example.com",
        name: "Officer A",
        role: "COMPLIANCE_OFFICER",
        status: "ACTIVE",
      }),
    );

    renderProbe();

    await act(async () => {
      screen.getByText("login").click();
    });

    await waitFor(() => expect(screen.getByTestId("role").textContent).toBe(ROLES.OFFICER));
    expect(screen.getByTestId("name").textContent).toBe("Officer A");

    await act(async () => {
      screen.getByText("logout").click();
    });

    mockSignIn.mockResolvedValueOnce({ ok: true, user: adminIdentity } satisfies LoginResult);
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        id: "b",
        email: "b@example.com",
        name: "Admin B",
        role: "ADMIN",
        status: "ACTIVE",
      }),
    );

    await act(async () => {
      screen.getByText("login").click();
    });

    // The bug: without queryClient.clear() in logout(), staleTime: 60_000 serves A's
    // cached /me response here instead of refetching for B.
    await waitFor(() => expect(screen.getByTestId("role").textContent).toBe(ROLES.ADMIN));
    expect(screen.getByTestId("name").textContent).toBe("Admin B");
    expect(screen.getByTestId("role").textContent).not.toBe(ROLES.OFFICER);
  });

  it("calls queryClient.clear() on logout", async () => {
    const clearSpy = vi.spyOn(queryClient, "clear");
    mockSignIn.mockResolvedValueOnce({ ok: true, user: officerIdentity } satisfies LoginResult);
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        id: "a",
        email: "a@example.com",
        name: "Officer A",
        role: "COMPLIANCE_OFFICER",
        status: "ACTIVE",
      }),
    );

    renderProbe();

    await act(async () => {
      screen.getByText("login").click();
    });
    await waitFor(() => expect(screen.getByTestId("role").textContent).toBe(ROLES.OFFICER));

    await act(async () => {
      screen.getByText("logout").click();
    });

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
