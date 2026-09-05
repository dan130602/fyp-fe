import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../auth-context.tsx";
import RequireRole from "../require-role.tsx";
import { ROLES } from "../roles.ts";

vi.mock("../auth-context.tsx", () => ({ useAuth: vi.fn() }));

const mockUseAuth = vi.mocked(useAuth);

function renderGuard(allow = [ROLES.OFFICER]) {
  return render(
    <MemoryRouter initialEntries={["/review"]}>
      <Routes>
        <Route
          path="/review"
          element={
            <RequireRole allow={allow}>
              <div>protected content</div>
            </RequireRole>
          }
        />
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/developer" element={<div>developer home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseAuth.mockReset();
});

describe("RequireRole", () => {
  it("renders nothing while loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      role: null,
      isAuthenticated: false,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
    });
    const { container } = renderGuard();
    expect(container).toBeEmptyDOMElement();
  });

  it("redirects to /login when not loading and there is no user", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      role: null,
      isAuthenticated: false,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    renderGuard();
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("redirects to the role's home when the role is not allowed", () => {
    mockUseAuth.mockReturnValue({
      user: {
        username: "test-developer",
        name: "Test Developer",
        initials: "TD",
        role: ROLES.DEVELOPER,
      },
      role: ROLES.DEVELOPER,
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    renderGuard([ROLES.OFFICER]);
    expect(screen.getByText("developer home")).toBeInTheDocument();
  });

  it("renders children when the role is allowed", () => {
    mockUseAuth.mockReturnValue({
      user: { username: "test-officer", name: "Test Officer", initials: "TO", role: ROLES.OFFICER },
      role: ROLES.OFFICER,
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    renderGuard([ROLES.OFFICER]);
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });
});
