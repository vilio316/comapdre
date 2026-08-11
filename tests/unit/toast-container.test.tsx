import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToastContainer } from "@/app/components/toast-container";
import { NotificationProvider, useNotifications } from "@/app/context/notification-context";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function Trigger() {
  const { success, error, info, addNotification } = useNotifications();
  return (
    <div>
      <button onClick={() => success("Uploaded", "file saved")}>add-success</button>
      <button onClick={() => error("Failed", "try again")}>add-error</button>
      <button onClick={() => info("FYI")}>add-info</button>
      <button
        onClick={() =>
          addNotification({
            type: "success",
            title: "Action toast",
            action: { label: "Go", href: "/dashboard/documents/x" },
            duration: 0,
          })
        }
      >
        add-action
      </button>
    </div>
  );
}

function renderToast() {
  return render(
    <NotificationProvider>
      <Trigger />
      <ToastContainer />
    </NotificationProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(window, "setTimeout").mockImplementation(((cb: () => void) => {
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout);
});

describe("ToastContainer", () => {
  it("renders nothing when there are no notifications", () => {
    renderToast();
    expect(document.querySelector(".fixed.right-4")).toBeNull();
  });

  it("shows a success toast with title and message", () => {
    renderToast();
    fireEvent.click(screen.getByText("add-success"));
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
    expect(screen.getByText("file saved")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows an error toast with an error icon", () => {
    renderToast();
    fireEvent.click(screen.getByText("add-error"));
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("try again")).toBeInTheDocument();
    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("shows an info toast without a message", () => {
    renderToast();
    fireEvent.click(screen.getByText("add-info"));
    expect(screen.getByText("FYI")).toBeInTheDocument();
  });

  it("renders an action link when provided", () => {
    renderToast();
    fireEvent.click(screen.getByText("add-action"));
    const link = screen.getByRole("link", { name: "Go" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard/documents/x");
  });

  it("dismisses a toast when its close button is clicked", () => {
    renderToast();
    fireEvent.click(screen.getByText("add-success"));
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
    const closeButton = screen.getAllByRole("button").find((b) => b.querySelector("svg"))!;
    fireEvent.click(closeButton);
    expect(screen.queryByText("Uploaded")).not.toBeInTheDocument();
    expect(document.querySelector(".fixed.right-4")).toBeNull();
  });
});
