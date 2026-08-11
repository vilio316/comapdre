import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NotificationProvider, useNotifications } from "@/app/context/notification-context";
import { NotificationCenter } from "@/app/components/notification-center";

function Seed() {
  const { success, info, addNotification } = useNotifications();
  return (
    <div>
      <button onClick={() => success("OCR Complete", "scan result")}>seed success</button>
      <button onClick={() => info("Info note")}>seed info</button>
      <button
        onClick={() =>
          addNotification({
            type: "success",
            title: "MCQs Ready",
            message: "questions done",
            action: { label: "View Questions", href: "/dashboard/mcq/result/key123" },
          })
        }
      >
        seed action
      </button>
    </div>
  );
}

function renderCenter() {
  return render(
    <NotificationProvider>
      <Seed />
      <NotificationCenter />
    </NotificationProvider>,
  );
}

describe("NotificationCenter", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a bell with no unread badge when there are no notifications", () => {
    renderCenter();
    const bell = screen.getByRole("button", { name: "Notifications" });
    expect(bell).toBeInTheDocument();
    expect(bell.textContent).not.toContain("1");
  });

  it("shows an unread badge matching the unread count", () => {
    renderCenter();
    fireEvent.click(screen.getByText("seed success"));
    fireEvent.click(screen.getByText("seed info"));
    const bell = screen.getByRole("button", { name: "Notifications (2 unread)" });
    expect(bell).toBeInTheDocument();
  });

  it("opens a dropdown listing notifications", () => {
    renderCenter();
    fireEvent.click(screen.getByText("seed success"));
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getByText("OCR Complete")).toBeInTheDocument();
    expect(screen.getByText("scan result")).toBeInTheDocument();
  });

  it("renders an action link pointing to the right section", () => {
    renderCenter();
    fireEvent.click(screen.getByText("seed action"));
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    const link = screen.getByRole("link", { name: "View Questions" });
    expect(link).toHaveAttribute("href", "/dashboard/mcq/result/key123");
  });

  it("marks all notifications as read from the panel", () => {
    renderCenter();
    fireEvent.click(screen.getByText("seed success"));
    fireEvent.click(screen.getByText("seed info"));
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /unread/ })).not.toBeInTheDocument();
  });

  it("clears history from the panel", () => {
    renderCenter();
    fireEvent.click(screen.getByText("seed success"));
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("marks a single notification read via its dot", () => {
    renderCenter();
    fireEvent.click(screen.getByText("seed success"));
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    fireEvent.click(screen.getByRole("button", { name: "Mark OCR Complete as read" }));
    expect(screen.queryByRole("button", { name: "Mark OCR Complete as read" })).not.toBeInTheDocument();
  });

  it("closes the panel when pressing Escape", () => {
    renderCenter();
    fireEvent.click(screen.getByText("seed success"));
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getByText("OCR Complete")).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByText("OCR Complete")).not.toBeInTheDocument();
  });
});
