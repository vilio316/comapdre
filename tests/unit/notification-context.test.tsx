import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { NotificationProvider, useNotifications } from "@/app/context/notification-context";

function Probe() {
  const { notifications, addNotification, success, error, info, removeNotification, history, unreadCount, markAsRead, markAllRead, clearHistory } = useNotifications();
  return (
    <div>
      <p data-testid="count">{notifications.length}</p>
      <p data-testid="hiscount">{history.length}</p>
      <p data-testid="unread">{unreadCount}</p>
      <div data-testid="toasts">
        {notifications.map((n) => (
          <div key={n.id}>
            <span data-testid="type">{n.type}</span>
            <span>{n.title}</span>
            <span>{n.message}</span>
            <button onClick={() => removeNotification(n.id)}>dismiss {n.id}</button>
          </div>
        ))}
      </div>
      {history.map((n) => (
        <div key={n.id}>
          <span data-testid={`hread-${n.id}`}>{n.read ? "read" : "unread"}</span>
          <span data-testid={`htitle-${n.id}`}>{n.title}</span>
        </div>
      ))}
      <button onClick={() => addNotification({ type: "info", title: "Manual", duration: 0 })}>add</button>
      <button onClick={() => addNotification({ type: "loading", title: "Loading", duration: 0 })}>loading</button>
      <button onClick={() => success("Success!", "ok")}>success</button>
      <button onClick={() => error("Error!", "bad")}>error</button>
      <button onClick={() => info("Info", undefined)}>info</button>
      <button onClick={() => markAsRead(history[0]?.id ?? "")}>mark first</button>
      <button onClick={markAllRead}>mark all</button>
      <button onClick={clearHistory}>clear</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <NotificationProvider>
      <Probe />
    </NotificationProvider>,
  );
}

describe("NotificationProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with no notifications", () => {
    renderProvider();
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("adds a notification via addNotification", () => {
    renderProvider();
    act(() => {
      fireEvent.click(screen.getByText("add"));
    });
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(within(screen.getByTestId("toasts")).getByText("Manual")).toBeInTheDocument();
  });

  it("creates helper notifications with correct types", () => {
    renderProvider();
    act(() => {
      fireEvent.click(screen.getByText("success"));
    });
    act(() => {
      fireEvent.click(screen.getByText("error"));
    });
    act(() => {
      fireEvent.click(screen.getByText("info"));
    });
    expect(screen.getByTestId("count").textContent).toBe("3");
    expect(screen.getAllByTestId("type").map((e) => e.textContent).sort()).toEqual(["error", "info", "success"]);
    expect(within(screen.getByTestId("toasts")).getByText("Success!")).toBeInTheDocument();
    expect(within(screen.getByTestId("toasts")).getByText("Error!")).toBeInTheDocument();
    expect(within(screen.getByTestId("toasts")).getByText("Info")).toBeInTheDocument();
  });

  it("auto-removes success notifications after the default duration", () => {
    renderProvider();
    act(() => {
      fireEvent.click(screen.getByText("success"));
    });
    expect(screen.getByTestId("count").textContent).toBe("1");
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("auto-removes error notifications after 6000ms", () => {
    renderProvider();
    act(() => {
      fireEvent.click(screen.getByText("error"));
    });
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("keeps notifications with duration 0 until dismissed", () => {
    renderProvider();
    act(() => {
      fireEvent.click(screen.getByText("add"));
    });
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("removes a notification on request", () => {
    renderProvider();
    act(() => {
      fireEvent.click(screen.getByText("add"));
    });
    const dismiss = screen.getByRole("button", { name: /dismiss/ });
    act(() => {
      fireEvent.click(dismiss);
    });
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("assigns unique sequential ids", () => {
    const seen = new Set<string>();
    renderProvider();
    for (const label of ["add", "success"]) {
      act(() => {
        fireEvent.click(screen.getByText(label));
      });
    }
    const dismissButtons = screen.getAllByRole("button", { name: /dismiss/ });
    for (const b of dismissButtons) {
      const id = b.textContent!.replace("dismiss ", "");
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
  });

  it("records notifications into persistent history and counts unread", () => {
    renderProvider();
    act(() => {
      fireEvent.click(screen.getByText("success"));
    });
    act(() => {
      fireEvent.click(screen.getByText("error"));
    });
    expect(screen.getByTestId("hiscount").textContent).toBe("2");
    expect(screen.getByTestId("unread").textContent).toBe("2");
    expect(screen.getAllByTestId(/^hread-/).every((e) => e.textContent === "unread")).toBe(true);
  });

  it("does not record loading notifications into history", () => {
    renderProvider();
    act(() => {
      fireEvent.click(screen.getByText("loading"));
    });
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("hiscount").textContent).toBe("0");
    expect(screen.getByTestId("unread").textContent).toBe("0");
  });

  it("marks a single notification as read", () => {
    renderProvider();
    act(() => {
      fireEvent.click(screen.getByText("success"));
    });
    act(() => {
      fireEvent.click(screen.getByText("mark first"));
    });
    expect(screen.getByTestId("unread").textContent).toBe("0");
    expect(screen.getAllByTestId(/^hread-/)[0].textContent).toBe("read");
  });

  it("marks all notifications as read", () => {
    renderProvider();
    act(() => {
      fireEvent.click(screen.getByText("success"));
    });
    act(() => {
      fireEvent.click(screen.getByText("error"));
    });
    act(() => {
      fireEvent.click(screen.getByText("mark all"));
    });
    expect(screen.getByTestId("unread").textContent).toBe("0");
    expect(screen.getAllByTestId(/^hread-/).every((e) => e.textContent === "read")).toBe(true);
  });

  it("clears notification history", () => {
    renderProvider();
    act(() => {
      fireEvent.click(screen.getByText("success"));
    });
    expect(screen.getByTestId("hiscount").textContent).toBe("1");
    act(() => {
      fireEvent.click(screen.getByText("clear"));
    });
    expect(screen.getByTestId("hiscount").textContent).toBe("0");
  });

  it("persists history to localStorage and restores it on remount", () => {
    const first = renderProvider();
    act(() => {
      fireEvent.click(screen.getByText("success"));
    });
    first.unmount();

    renderProvider();
    expect(screen.getByTestId("hiscount").textContent).toBe("1");
    expect(screen.getByTestId("unread").textContent).toBe("1");
  });
});
