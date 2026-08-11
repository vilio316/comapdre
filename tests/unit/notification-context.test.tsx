import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NotificationProvider, useNotifications } from "@/app/context/notification-context";

function Probe() {
  const { notifications, addNotification, success, error, info, removeNotification } = useNotifications();
  return (
    <div>
      <p data-testid="count">{notifications.length}</p>
      {notifications.map((n) => (
        <div key={n.id}>
          <span data-testid="type">{n.type}</span>
          <span>{n.title}</span>
          <span>{n.message}</span>
          <button onClick={() => removeNotification(n.id)}>dismiss {n.id}</button>
        </div>
      ))}
      <button onClick={() => addNotification({ type: "info", title: "Manual", duration: 0 })}>add</button>
      <button onClick={() => success("Success!", "ok")}>success</button>
      <button onClick={() => error("Error!", "bad")}>error</button>
      <button onClick={() => info("Info", undefined)}>info</button>
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
    expect(screen.getByText("Manual")).toBeInTheDocument();
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
    expect(screen.getByText("Success!")).toBeInTheDocument();
    expect(screen.getByText("Error!")).toBeInTheDocument();
    expect(screen.getByText("Info")).toBeInTheDocument();
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
});
