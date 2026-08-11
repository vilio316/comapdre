import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NotificationProvider, useNotifications } from "@/app/context/notification-context";
import { OcrProvider, useOcr } from "@/app/context/ocr-context";

function Probe() {
  const { jobs, submitFileOcr, submitDocumentOcr } = useOcr();
  const { notifications } = useNotifications();
  return (
    <div>
      <p data-testid="jobcount">{Object.keys(jobs).length}</p>
      {Object.entries(jobs).map(([id, j]) => (
        <p key={id} data-testid={`job-${id}`}>
          {id}:{j.status}:{j.result ?? ""}:{j.error ?? ""}
        </p>
      ))}
      <p data-testid="notifcount">{notifications.length}</p>
      <button
        onClick={async () => {
          try {
            await submitFileOcr([new File(["x"], "a.png", { type: "image/png" })], "My scan");
          } catch (e) {
            (document.querySelector("[data-testid=submit-error]") as HTMLElement).textContent =
              (e as Error).message;
          }
        }}
      >
        submit-file
      </button>
      <button
        onClick={async () => {
          try {
            await submitDocumentOcr("doc1.pdf", "Doc OCR");
          } catch (e) {
            (document.querySelector("[data-testid=submit-error]") as HTMLElement).textContent =
              (e as Error).message;
          }
        }}
      >
        submit-doc
      </button>
      <span data-testid="submit-error" />
    </div>
  );
}

function renderOcr() {
  return render(
    <NotificationProvider>
      <OcrProvider>
        <Probe />
      </OcrProvider>
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

describe("OcrProvider", () => {
  it("submits local files and tracks a pending job", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: "j1" }) });

    renderOcr();
    await act(async () => {
      fireEvent.click(screen.getByText("submit-file"));
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/ocr", expect.anything());
    expect(screen.getByTestId("jobcount").textContent).toBe("1");
    expect(screen.getByTestId("job-j1").textContent).toContain("pending");
    expect(screen.getByTestId("notifcount").textContent).toBe("1");
  });

  it("throws the server error message on failed submission", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "No files" }) });

    renderOcr();
    await act(async () => {
      fireEvent.click(screen.getByText("submit-file"));
    });

    expect(screen.getByTestId("submit-error").textContent).toBe("No files");
    expect(screen.getByTestId("jobcount").textContent).toBe("0");
  });

  it("returns a cached result when the server says so", async () => {
    let cachedResult: unknown;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cached: true, result: "already extracted" }),
    });

    renderOcr();
    await act(async () => {
      fireEvent.click(screen.getByText("submit-doc"));
    });

    expect(screen.getByTestId("jobcount").textContent).toBe("0");
    expect(screen.getByTestId("notifcount").textContent).toBe("1");
    void cachedResult;
  });

  it("polls a job to completion and fires a success notification", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: "j1" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "done", result: "the text" }),
      });

    renderOcr();
    await act(async () => {
      fireEvent.click(screen.getByText("submit-file"));
    });

    expect(screen.getByTestId("job-j1").textContent).toContain("pending");

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("job-j1").textContent).toContain("done");
    expect(screen.getByTestId("job-j1").textContent).toContain("the text");
    expect(screen.getByTestId("notifcount").textContent).toBe("1");
  });

  it("marks a job failed when the server reports failure", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: "j1" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "failed", error: "quota" }),
      });

    renderOcr();
    await act(async () => {
      fireEvent.click(screen.getByText("submit-file"));
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("job-j1").textContent).toContain("failed");
    expect(screen.getByTestId("job-j1").textContent).toContain("quota");
  });

  it("restores a persisted job on mount and notifies on completion", async () => {
    window.localStorage.setItem(
      "compadre:ocr-active-jobs",
      JSON.stringify([{ jobId: "j-stale", label: "Old scan" }]),
    );
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "done", result: "restored text" }),
    });

    renderOcr();
    expect(screen.getByTestId("jobcount").textContent).toBe("1");
    expect(screen.getByTestId("job-j-stale").textContent).toContain("pending");

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("job-j-stale").textContent).toContain("done");
    expect(screen.getByTestId("job-j-stale").textContent).toContain("restored text");
    expect(screen.getByTestId("notifcount").textContent).toBe("1");
    expect(JSON.parse(window.localStorage.getItem("compadre:ocr-active-jobs") ?? "[]")).toEqual([]);
  });

  it("drops a persisted job when the server returns 404", async () => {
    window.localStorage.setItem(
      "compadre:ocr-active-jobs",
      JSON.stringify([{ jobId: "j-gone", label: "Expired scan" }]),
    );
    fetchMock.mockResolvedValueOnce({ status: 404, ok: false, json: async () => ({ error: "not found" }) });

    renderOcr();
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("jobcount").textContent).toBe("0");
    expect(JSON.parse(window.localStorage.getItem("compadre:ocr-active-jobs") ?? "[]")).toEqual([]);
  });
});
