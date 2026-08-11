import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationProvider } from "@/app/context/notification-context";
import Navbar from "@/app/components/navbar";

const useSessionMock = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => useSessionMock(),
    signOut: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));

function renderNavbar() {
  return render(
    <NotificationProvider>
      <Navbar />
    </NotificationProvider>,
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    useSessionMock.mockReturnValue({ data: { user: { id: "u1" } } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the notification bell for signed-in users", () => {
    renderNavbar();
    expect(screen.getByRole("button", { name: /Notifications/ })).toBeInTheDocument();
  });

  it("hides the notification bell for signed-out users", () => {
    useSessionMock.mockReturnValue({ data: null });
    renderNavbar();
    expect(screen.queryByRole("button", { name: /Notifications/ })).not.toBeInTheDocument();
  });
});
