import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import UploadPipeline from "@/app/components/upload-pipeline";

class MockXHR {
  static instances: MockXHR[] = [];
  upload = { addEventListener: vi.fn((_e: string, cb: (ev: { lengthComputable: boolean; loaded: number; total: number }) => void) => {
    this.progressCb = cb;
  }) };
  status = 200;
  responseText = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private progressCb: ((ev: { lengthComputable: boolean; loaded: number; total: number }) => void) | null = null;
  listeners: Record<string, (() => void)[]> = {};

  constructor() {
    MockXHR.instances.push(this);
  }

  addEventListener(event: string, cb: () => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  open(_method: string, _url: string) {}

  send() {}

  triggerProgress(loaded: number, total: number) {
    this.progressCb?.({ lengthComputable: true, loaded, total });
  }

  succeed() {
    this.listeners["load"]?.forEach((cb) => cb());
  }

  failWithStatus(status: number, responseText: string) {
    this.status = status;
    this.responseText = responseText;
    this.listeners["load"]?.forEach((cb) => cb());
  }

  networkError() {
    this.listeners["error"]?.forEach((cb) => cb());
  }
}

const originalXHR = globalThis.XMLHttpRequest;

beforeEach(() => {
  MockXHR.instances = [];
  vi.stubGlobal("XMLHttpRequest", MockXHR);
});

afterAll(() => {
  vi.unstubAllGlobals();
  globalThis.XMLHttpRequest = originalXHR;
});

const onComplete = vi.fn();
const onCancel = vi.fn();

function renderPipeline() {
  return render(<UploadPipeline onComplete={onComplete} onCancel={onCancel} />);
}

function selectFile(name = "notes.pdf", type = "application/pdf", bytes = 10) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File([new Uint8Array(bytes)], name, { type });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

describe("UploadPipeline", () => {
  it("shows the initial upload prompt", () => {
    renderPipeline();
    expect(screen.getByText(/Click to upload/)).toBeInTheDocument();
    expect(screen.getByText(/PDF, DOCX, or image up to 30 MB/)).toBeInTheDocument();
  });

  it("calls onCancel when the header close button is clicked", () => {
    renderPipeline();
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("rejects files with unsupported extensions", () => {
    renderPipeline();
    selectFile("virus.exe", "application/octet-stream");
    expect(screen.getByText(/Only PDF, DOCX, and image files/)).toBeInTheDocument();
    expect(screen.queryByText("Upload")).not.toBeInTheDocument();
  });

  it("rejects files over the 30 MB limit", () => {
    renderPipeline();
    selectFile("big.pdf", "application/pdf", 31 * 1024 * 1024);
    expect(screen.getByText(/30 MB limit/)).toBeInTheDocument();
  });

  it("accepts a valid file and shows the upload action", () => {
    renderPipeline();
    selectFile();
    expect(screen.getByText("notes.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
  });

  it("allows renaming the file before upload", () => {
    renderPipeline();
    selectFile();
    const nameInput = document.querySelectorAll("input")[1] as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "renamed.pdf" } });
    expect(screen.getByText("renamed.pdf")).toBeInTheDocument();
  });

  it("uploads via XHR and reports progress", async () => {
    renderPipeline();
    selectFile();
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));

    expect(MockXHR.instances).toHaveLength(1);
    const xhr = MockXHR.instances[0];
    act(() => {
      xhr.triggerProgress(50, 100);
    });
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/Uploading and processing/)).toBeInTheDocument();

    act(() => {
      xhr.succeed();
    });
    await waitFor(() => {
      expect(screen.getByText("Uploaded successfully")).toBeInTheDocument();
    });
  });

  it("shows an error message from the server response", async () => {
    renderPipeline();
    selectFile();
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));

    const xhr = MockXHR.instances[0];
    act(() => {
      xhr.failWithStatus(500, JSON.stringify({ error: "Server exploded" }));
    });
    await waitFor(() => {
      expect(screen.getByText("Server exploded")).toBeInTheDocument();
    });
    expect(screen.queryByText("Uploaded successfully")).not.toBeInTheDocument();
  });

  it("falls back to a generic error when the response is not json", async () => {
    renderPipeline();
    selectFile();
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));

    const xhr = MockXHR.instances[0];
    act(() => {
      xhr.failWithStatus(400, "plain text");
    });
    await waitFor(() => {
      expect(screen.getByText(/Upload failed \(400\)/)).toBeInTheDocument();
    });
  });

  it("shows a network error message", async () => {
    renderPipeline();
    selectFile();
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));

    const xhr = MockXHR.instances[0];
    act(() => {
      xhr.networkError();
    });
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("lets the user add and remove tags after uploading", async () => {
    renderPipeline();
    selectFile();
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    act(() => { MockXHR.instances[0].succeed(); });
    await waitFor(() => {
      expect(screen.getByText("Uploaded successfully")).toBeInTheDocument();
    });

    const tagInput = screen.getByPlaceholderText(/Type a tag/);
    fireEvent.change(tagInput, { target: { value: "Biology" } });
    const addButton = screen.getByRole("button", { name: "Add" });
    await waitFor(() => {
      expect(addButton).toBeEnabled();
    });
    fireEvent.click(addButton);
    expect(screen.getByText("biology")).toBeInTheDocument();

    const removeTag = screen.getAllByRole("button").find((b) => {
      const text = b.closest("span")?.textContent;
      return text?.includes("biology") && b.querySelector("svg");
    })!;
    fireEvent.click(removeTag);
    expect(screen.queryByText("biology")).not.toBeInTheDocument();
  });

  it("calls onComplete with the uploaded file and tags on Done", async () => {
    renderPipeline();
    selectFile("notes.pdf", "application/pdf");
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    act(() => { MockXHR.instances[0].succeed(); });
    await waitFor(() => {
      expect(screen.getByText("Uploaded successfully")).toBeInTheDocument();
    });

    const tagInput = screen.getByPlaceholderText(/Type a tag/);
    fireEvent.change(tagInput, { target: { value: "chemistry" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    const [file, tags] = onComplete.mock.calls[0] as [unknown, string[]];
    expect(file).toMatchObject({ name: "notes.pdf", type: "PDF" });
    expect(tags).toEqual(["chemistry"]);
  });
});

