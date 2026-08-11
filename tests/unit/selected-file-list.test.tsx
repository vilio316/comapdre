import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SelectedFileList from "@/app/components/selected-file-list";

function makeFile(name: string, type = "application/pdf") {
  return new File(["data"], name, { type });
}

describe("SelectedFileList", () => {
  it("renders each file name", () => {
    render(<SelectedFileList files={[makeFile("notes.pdf"), makeFile("diagram.png", "image/png")]} />);
    expect(screen.getByText("notes.pdf")).toBeInTheDocument();
    expect(screen.getByText("diagram.png")).toBeInTheDocument();
  });

  it("derives a label from the extension", () => {
    render(<SelectedFileList files={[makeFile("notes.pdf")]} />);
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("derives a label from the mime type when the extension is unknown", () => {
    render(<SelectedFileList files={[makeFile("archive", "application/zip")]} />);
    expect(screen.getByText("ZIP")).toBeInTheDocument();
  });

  it("falls back to FILE when neither extension nor mime type is meaningful", () => {
    render(<SelectedFileList files={[makeFile("mystery", "")]} />);
    expect(screen.getByText("FILE")).toBeInTheDocument();
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(<SelectedFileList files={[]} />);
    expect(container.querySelectorAll("li")).toHaveLength(0);
  });

  it("handles case-insensitive extensions", () => {
    render(<SelectedFileList files={[makeFile("NOTES.PDF")]} />);
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("shows DOCX and JPEG labels", () => {
    render(
      <SelectedFileList
        files={[makeFile("a.docx"), makeFile("b.jpeg", "image/jpeg")]}
      />,
    );
    expect(screen.getByText("DOCX")).toBeInTheDocument();
    expect(screen.getByText("JPEG")).toBeInTheDocument();
  });
});
