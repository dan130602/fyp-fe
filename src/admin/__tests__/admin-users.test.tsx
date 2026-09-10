import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api-client.ts";

vi.mock("../../auth/auth-context.jsx", () => ({ useAuth: vi.fn() }));
vi.mock("../../auth/current-user.ts", () => ({ useCurrentUser: vi.fn() }));
vi.mock("../use-admin-users.ts", () => ({
  useAdminUsers: vi.fn(),
  useCreateUser: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    reset: vi.fn(),
  })),
  useUpdateUserRole: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    reset: vi.fn(),
  })),
  useUpdateUserStatus: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    reset: vi.fn(),
  })),
}));

const { useAuth } = await import("../../auth/auth-context.jsx");
const { useCurrentUser } = await import("../../auth/current-user.ts");
const { useAdminUsers } = await import("../use-admin-users.ts");
const { default: AdminUsers } = await import("../../views/admin-users.tsx");

const mockUseAuth = vi.mocked(useAuth);
const mockUseCurrentUser = vi.mocked(useCurrentUser);
const mockUseAdminUsers = vi.mocked(useAdminUsers);

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseCurrentUser.mockReset();
  mockUseAdminUsers.mockReset();

  mockUseAuth.mockReturnValue({
    user: { username: "admin", name: "Admin User", initials: "AU" },
    role: "ADMIN",
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
  mockUseCurrentUser.mockReturnValue({ data: { id: "self-id" } } as unknown as ReturnType<
    typeof useCurrentUser
  >);
});

describe("AdminUsers", () => {
  it("renders a 403 state when the backend refuses the list (e.g. a folded-in MANAGER)", () => {
    mockUseAdminUsers.mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError(403, "You do not have permission to perform this action"),
      data: undefined,
    } as unknown as ReturnType<typeof useAdminUsers>);

    render(<AdminUsers />);

    expect(screen.getByText("You do not have permission to view this page")).toBeInTheDocument();
    expect(screen.queryByText("No users yet")).not.toBeInTheDocument();
  });

  it("renders a deliberate empty state when there are zero users", () => {
    mockUseAdminUsers.mockReturnValue({
      isPending: false,
      isError: false,
      error: null,
      data: [],
    } as unknown as ReturnType<typeof useAdminUsers>);

    render(<AdminUsers />);

    expect(screen.getByText("No users yet")).toBeInTheDocument();
  });

  it("renders the table, not the empty state, when users exist", () => {
    mockUseAdminUsers.mockReturnValue({
      isPending: false,
      isError: false,
      error: null,
      data: [
        {
          id: "1",
          email: "a@example.com",
          name: "A",
          role: "ADMIN",
          status: "ACTIVE",
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
    } as unknown as ReturnType<typeof useAdminUsers>);

    render(<AdminUsers />);

    expect(screen.queryByText("No users yet")).not.toBeInTheDocument();
    expect(screen.getByText("a@example.com")).toBeInTheDocument();
  });
});
