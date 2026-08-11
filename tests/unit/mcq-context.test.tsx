import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NotificationProvider } from "@/app/context/notification-context";
import { McqProvider, useMcq } from "@/app/context/mcq-context";

function Probe() {
  const { jobs, submitMcq } = useMcq();
  return (
    <div>
      <p data-testid="jobcount">{Object.keys(jobs).length}</p>
      {Object.entries(jobs).map(([id, j]) => (
        <p key={id} data-testid={`job-${id}`}>
          {id}:{j.status}:{j.resultKey ?? ""}:{j.error ?? ""}
        </p>
      ))}
      <button
        onClick={async () => {
          try {
            await submitMcq([], ["notes.pdf"], 5, "Notes");
          } catch (e) {
            (document.querySelector("[data-testid=submit-error]") as HTMLElement).textContent =
              (e as Error).message;
          }
        }}
      >
        submit
      </button>
      <span data-testid="submit-error" />
    </div>
  );
}

function renderMcq() {
  return render(
    <NotificationProvider>
      <McqProvider>
        <Probe />
      </McqProvider>
    </NotificationProvider>,
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("fetch", fetchMock);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("McqProvider", () => {
  it("submits keys and tracks a pending job", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobId: "j1", resultKey: "mcq:v1:5:abc" }),
    });

    renderMcq();
    await act(async () => {
      fireEvent.click(screen.getByText("submit"));
    });

    const fd = fetchMock.mock.calls[0][1].body as FormData;
    expect(fetchMock).toHaveBeenCalledWith("/api/mcq", expect.anything());
    expect(fd.getAll("keys")).toEqual(["notes.pdf"]);
    expect(fd.get("count")).toBe("5");
    expect(screen.getByTestId("job-j1").textContent).toContain("pending");
    expect(screen.getByTestId("job-j1").textContent).toContain("mcq:v1:5:abc");
  });

  it("returns a cached result without creating a job", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ resultKey: "mcq:v1:5:abc", cached: true }),
    });

    renderMcq();
    await act(async () => {
      fireEvent.click(screen.getByText("submit"));
    });

    expect(screen.getByTestId("jobcount").textContent).toBe("0");
  });

  it("throws the server error message on failure", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Too many" }) });

    renderMcq();
    await act(async () => {
      fireEvent.click(screen.getByText("submit"));
    });

    expect(screen.getByTestId("submit-error").textContent).toBe("Too many");
    expect(screen.getByTestId("jobcount").textContent).toBe("0");
  });

  it("polls a job to done and records the resultKey", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: "j1", resultKey: "mcq:v1:5:abc" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "done", resultKey: "mcq:v1:5:abc" }),
      });

    renderMcq();
    await act(async () => {
      fireEvent.click(screen.getByText("submit"));
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("job-j1").textContent).toContain("done");
    expect(screen.getByTestId("job-j1").textContent).toContain("mcq:v1:5:abc");
  });

  it("marks a job failed when the server reports failure", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: "j1", resultKey: "k" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "failed", error: "gen exploded" }),
      });

    renderMcq();
    await act(async () => {
      fireEvent.click(screen.getByText("submit"));
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("job-j1").textContent).toContain("failed");
    expect(screen.getByTestId("job-j1").textContent).toContain("gen exploded");
  });

  it("restores a persisted job on mount and notifies on completion", async () => {
    window.localStorage.setItem(
      "compadre:mcq-active-jobs",
      JSON.stringify([{ jobId: "j-stale", label: "Old gen", resultKey: "mcq:v1:5:xyz" }]),
    );
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "done", resultKey: "mcq:v1:5:xyz" }),
    });

    renderMcq();
    expect(screen.getByTestId("jobcount").textContent).toBe("1");
    expect(screen.getByTestId("job-j-stale").textContent).toContain("pending");

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("job-j-stale").textContent).toContain("done");
    expect(screen.getByTestId("job-j-stale").textContent).toContain("mcq:v1:5:xyz");
    expect(JSON.parse(window.localStorage.getItem("compadre:mcq-active-jobs") ?? "[]")).toEqual([]);
  });

  it("drops a persisted job when the server returns 404", async () => {
    window.localStorage.setItem(
      "compadre:mcq-active-jobs",
      JSON.stringify([{ jobId: "j-gone", label: "Expired gen" }]),
    );
    fetchMock.mockResolvedValueOnce({ status: 404, ok: false, json: async () => ({ error: "not found" }) });

    renderMcq();
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("jobcount").textContent).toBe("0");
    expect(JSON.parse(window.localStorage.getItem("compadre:mcq-active-jobs") ?? "[]")).toEqual([]);
  });
});
