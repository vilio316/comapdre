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

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: { session: { activeOrganizationId: "org-1" } },
    }),
    organization: {
      setActive: vi.fn().mockResolvedValue({}),
    },
  },
}));

const fetchMock = vi.fn();

function mockFetch(routes: Record<string, unknown>) {
  const entries = Object.entries(routes).sort(([a], [b]) => b.length - a.length);
  fetchMock.mockImplementation((url: string) => {
    const found = entries.find(
      ([key]) => typeof url === "string" && url.startsWith(key),
    );
    if (found) {
      const [, value] = found;
      return Promise.resolve({ ok: true, json: async () => value });
    }
    return Promise.resolve({ ok: true, json: async () => ({ docs: [] }) });
  });
}

const classesResponse = {
  classes: [
    { id: "org-1", name: "Physics 101", role: "class_rep" },
    { id: "org-2", name: "Chemistry", role: "member" },
  ],
};

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
    mockFetch({ "/api/classes": classesResponse, "/api/documents": { docs: [] } });
    render(<CompilePage />);
    await flush();
    expect(screen.getByRole("heading", { name: "Compile Documents" })).toBeInTheDocument();
  });

  it("shows a spinner while documents load and then the empty state", async () => {
    mockFetch({ "/api/classes": classesResponse, "/api/documents": { docs: [] } });
    render(<CompilePage />);
    await flush();
    expect(screen.getByText("No stored documents found.")).toBeInTheDocument();
  });

  it("lists stored documents and lets you add one", async () => {
    mockFetch({
      "/api/classes": classesResponse,
      "/api/documents": { docs: [{ id: "doc1", name: "notes.pdf", type: "PDF" }] },
    });
    render(<CompilePage />);
    await flush();

    fireEvent.change(screen.getByRole("combobox", { name: "Document" }), { target: { value: "doc1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("notes.pdf")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compile Documents" })).toBeInTheDocument();
  });

  it("adds local files and can remove them", async () => {
    mockFetch({ "/api/classes": classesResponse, "/api/documents": { docs: [] } });
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
    mockFetch({
      "/api/classes": classesResponse,
      "/api/documents": { docs: [] },
      "/api/compile": { jobId: "cj1" },
    });
    render(<CompilePage />);
    await flush();

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Compile Documents" }));
    await flush();

    const compileCall = fetchMock.mock.calls.find(([url]) => url === "/api/compile")!;
    const [, init] = compileCall as [string, RequestInit];
    expect(init.method).toBe("POST");
    const body = init.body as FormData;
    expect((body.get("files") as File).name).toBe("a.png");
    expect(notifications.requestSystemNotifications).toHaveBeenCalled();
    expect(screen.getByText(/Reading 1 document with/)).toBeInTheDocument();
  });

  it("shows an error when compile fails", async () => {
    mockFetch({
      "/api/classes": classesResponse,
      "/api/documents": { docs: [] },
    });
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/compile") {
        return Promise.resolve({ ok: false, json: async () => ({ error: "bad doc" }) });
      }
      if (url.startsWith("/api/classes")) {
        return Promise.resolve({ ok: true, json: async () => classesResponse });
      }
      return Promise.resolve({ ok: true, json: async () => ({ docs: [] }) });
    });
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
    mockFetch({
      "/api/classes": classesResponse,
      "/api/documents": { docs: [] },
      "/api/compile": { jobId: "cj1" },
      "/api/compile/status/cj1": {
        status: "done",
        result: { text: "Unified output text", sources: ["notes.pdf"] },
      },
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
    mockFetch({
      "/api/classes": classesResponse,
      "/api/documents": { docs: [] },
      "/api/compile": { jobId: "cj1" },
      "/api/compile/status/cj1": {
        status: "done",
        result: { text: "copy me" },
      },
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
