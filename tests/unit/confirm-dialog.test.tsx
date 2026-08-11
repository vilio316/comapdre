import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ConfirmDialog from "@/app/components/confirm-dialog";

const onConfirm = vi.fn();
const onCancel = vi.fn();

function renderDialog(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  return render(
    <ConfirmDialog
      open
      title="Delete document?"
      message="This cannot be undone."
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
}

beforeEach(() => {
  onConfirm.mockClear();
  onCancel.mockClear();
});

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <ConfirmDialog open={false} title="t" message="m" onConfirm={onConfirm} onCancel={onCancel} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the title and message when open", () => {
    renderDialog();
    expect(screen.getByText("Delete document?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("uses default labels", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("allows custom labels", () => {
    renderDialog({ confirmLabel: "Remove", cancelLabel: "Keep" });
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the cancel button is clicked", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the backdrop is clicked", () => {
    const { container } = renderDialog();
    const backdrop = container.querySelector(".fixed.inset-0.bg-black\\/40")!;
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Escape is pressed", () => {
    renderDialog();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not respond to Escape when closed", () => {
    render(
      <ConfirmDialog open={false} title="t" message="m" onConfirm={onConfirm} onCancel={onCancel} />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("focuses the confirm button when opened", async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();
    });
  });

  it("removes the keydown listener when reopened", async () => {
    const { rerender } = renderDialog();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(
      <ConfirmDialog open={false} title="t" message="m" onConfirm={onConfirm} onCancel={onCancel} />,
    );
    onCancel.mockClear();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
