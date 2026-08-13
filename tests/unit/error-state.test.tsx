import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorState from "@/app/components/error-state";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  vi.unstubAllEnvs();
  process.env.NODE_ENV = originalNodeEnv;
});

function makeError(message: string, stack = "Error: boom\n  at test:1:1") {
  const err = new Error(message) as Error & { digest?: string };
  err.stack = stack;
  return err;
}

describe("ErrorState", () => {
  it("shows a friendly title and message without exposing the raw error", () => {
    process.env.NODE_ENV = "production";
    render(<ErrorState error={makeError("redis unreachable")} />);
    expect(screen.getByRole("heading", { name: /processing/i })).toBeInTheDocument();
    expect(screen.queryByText(/redis unreachable/)).not.toBeInTheDocument();
    expect(screen.queryByText(/at test:1:1/)).not.toBeInTheDocument();
  });

  it("does not render technical details in production", () => {
    process.env.NODE_ENV = "production";
    render(<ErrorState error={makeError("something broke")} />);
    expect(screen.queryByText(/technical details/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/at test:1:1/)).not.toBeInTheDocument();
  });

  it("renders the retry button and calls retry on click", () => {
    const retry = vi.fn();
    render(<ErrorState error={makeError("boom")} retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("links back to the dashboard", () => {
    render(<ErrorState error={makeError("boom")} />);
    expect(screen.getByRole("link", { name: /back to dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("shows the digest in development only", () => {
    process.env.NODE_ENV = "development";
    const err = makeError("boom");
    err.digest = "abc123";
    const { unmount } = render(<ErrorState error={err} />);
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
    unmount();

    process.env.NODE_ENV = "production";
    render(<ErrorState error={err} />);
    expect(screen.queryByText(/abc123/)).not.toBeInTheDocument();
  });

  it("shows technical details in development", () => {
    process.env.NODE_ENV = "development";
    render(<ErrorState error={makeError("boom")} />);
    fireEvent.click(screen.getByText(/technical details/i));
    expect(screen.getByText(/at test:1:1/)).toBeInTheDocument();
  });
});
