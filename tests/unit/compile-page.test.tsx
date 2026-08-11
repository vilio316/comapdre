import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import CompilePage from "@/app/dashboard/compile/page";

const notifications = {
  addNotification: vi.fn(),
  requestSystemNotifications: vi.fn(),
  notifySystem: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

vi.mock("@/app/context/notification-context", () => ({
  useNotifications: () => notifications,
}));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("CompilePage", () => {
  it("shows the page heading and subtext", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ docs: [] }) });
    render(<CompilePage />);
    await flush();
    expect(screen.getByRole("heading", { name: "Compile Documents" })).toBeInTheDocument();
  });

  it("shows a spinner while documents load and then the empty state", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ docs: [] }) });
    render(<CompilePage />);
    await flush();
    expect(screen.getByText("No stored documents found.")).toBeInTheDocument();
  });

  it("lists stored documents and lets you add one", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ docs: [{ id: "doc1", name: "notes.pdf", type: "PDF" }] }),
    });
    render(<CompilePage />);
    await flush();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "doc1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("notes.pdf")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compile Documents" })).toBeInTheDocument();
  });

  it("adds local files and can remove them", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ docs: [] }) });
    render(<CompilePage />);
    await flush();

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "report.pdf", { type: "application/pdf" })] },
    });

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("1 file selected")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove report.pdf" }));
    expect(screen.queryByText("report.pdf")).not.toBeInTheDocument();
  });

  it("posts a compile request with files and keys", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ docs: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: "cj1" }) });
    render(<CompilePage />);
    await flush();

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Compile Documents" }));
    await flush();

    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe("/api/compile");
    expect(init.method).toBe("POST");
    const body = init.body as FormData;
    expect((body.get("files") as File).name).toBe("a.png");
    expect(notifications.requestSystemNotifications).toHaveBeenCalled();
    expect(screen.getByText(/Reading 1 document with/)).toBeInTheDocument();
  });

  it("shows an error when compile fails", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ docs: [] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "bad doc" }) });
    render(<CompilePage />);
    await flush();

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Compile Documents" }));
    await flush();

    expect(screen.getByText("bad doc")).toBeInTheDocument();
  });

  it("polls compile status to done and shows the preview", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ docs: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: "cj1" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "done",
          result: { text: "Unified output text", sources: ["notes.pdf"] },
        }),
      });
    render(<CompilePage />);
    await flush();

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Compile Documents" }));
    await flush();

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("Unified output text")).toBeInTheDocument();
    expect(screen.getByText(/Sources: notes.pdf/)).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save as PDF" })).toBeInTheDocument();
  });

  it("copies output to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    (navigator.clipboard as { writeText: typeof writeText }) = { writeText };
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ docs: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: "cj1" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "done", result: { text: "copy me" } }),
      });
    render(<CompilePage />);
    await flush();

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Compile Documents" }));
    await flush();

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await flush();
    expect(writeText).toHaveBeenCalledWith("copy me");
    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });
});
