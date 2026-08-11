import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OCRPage from "@/app/dashboard/ocr/page";

const ocrContext = {
  jobs: {} as Record<string, unknown>,
  submitFileOcr: vi.fn(),
  submitDocumentOcr: vi.fn(),
};

vi.mock("@/app/context/ocr-context", () => ({
  useOcr: () => ocrContext,
}));

beforeEach(() => {
  vi.clearAllMocks();
  ocrContext.jobs = {};
  ocrContext.submitFileOcr.mockReset();
  ocrContext.submitFileOcr.mockResolvedValue("job-1");
});

describe("OCRPage", () => {
  it("shows the page heading and upload prompt", () => {
    render(<OCRPage />);
    expect(screen.getByRole("heading", { name: "OCR Scanner" })).toBeInTheDocument();
    expect(screen.getByText(/Tap to upload/)).toBeInTheDocument();
  });

  it("accepts image files and shows the scan button", () => {
    render(<OCRPage />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    expect(screen.getByRole("button", { name: /Scan for Text/ })).toBeInTheDocument();
  });

  it("ignores non-image files", () => {
    render(<OCRPage />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "notes.pdf", { type: "application/pdf" })] },
    });
    expect(screen.queryByRole("button", { name: /Scan/ })).not.toBeInTheDocument();
  });

  it("accepts image files even when the mime type is empty", () => {
    render(<OCRPage />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "photo.jpg", { type: "" })] },
    });
    expect(screen.getByRole("button", { name: /Scan for Text/ })).toBeInTheDocument();
  });

  it("submits files and tracks the job from context", async () => {
    ocrContext.submitFileOcr.mockResolvedValue("job-1");
    render(<OCRPage />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });

    fireEvent.click(screen.getByRole("button", { name: /Scan for Text/ }));
    await waitFor(() => {
      expect(ocrContext.submitFileOcr).toHaveBeenCalled();
    });
    const [submitted, label] = ocrContext.submitFileOcr.mock.calls[0] as [File[], string];
    expect(submitted[0].name).toBe("a.png");
    expect(label).toBe("a.png");
  });

  it("shows processing state while the job is active", async () => {
    ocrContext.jobs = { "job-1": { status: "processing" } };
    render(<OCRPage />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Scan for Text/ }));
    await waitFor(() => {
      expect(screen.getByText("Processing in background...")).toBeInTheDocument();
    });
  });

  it("renders extracted text when the job is done", async () => {
    ocrContext.jobs = { "job-1": { status: "done", result: "Extracted line one\nline two" } };
    render(<OCRPage />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Scan for Text/ }));
    await waitFor(() => {
      expect(screen.getByText(/Extracted line one\s+line two/)).toBeInTheDocument();
    });
  });

  it("does not render the scan button when a result is showing", async () => {
    ocrContext.jobs = { "job-1": { status: "done", result: "done text" } };
    render(<OCRPage />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Scan for Text/ }));
    await waitFor(() => {
      expect(screen.getByText("done text")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Scan for Text/ })).not.toBeInTheDocument();
  });
});
