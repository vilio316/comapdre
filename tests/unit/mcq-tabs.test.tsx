import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import McqTabs from "@/app/components/mcq-tabs";

const pathnameRef = { value: "/dashboard/mcq" };

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameRef.value,
}));

beforeEach(() => {
  pathnameRef.value = "/dashboard/mcq";
});

describe("McqTabs", () => {
  it("marks Generate active on the generate route", () => {
    render(<McqTabs />);
    const generate = screen.getByRole("link", { name: "Generate" });
    const history = screen.getByRole("link", { name: "History" });
    expect(generate.className).toContain("bg-gold");
    expect(history.className).not.toContain("bg-gold");
  });

  it("marks History active on the history route", () => {
    pathnameRef.value = "/dashboard/mcq/history";
    render(<McqTabs />);
    const generate = screen.getByRole("link", { name: "Generate" });
    const history = screen.getByRole("link", { name: "History" });
    expect(history.className).toContain("bg-gold");
    expect(generate.className).not.toContain("bg-gold");
  });

  it("links to the generate and history pages", () => {
    render(<McqTabs />);
    expect(screen.getByRole("link", { name: "Generate" })).toHaveAttribute("href", "/dashboard/mcq");
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("href", "/dashboard/mcq/history");
  });
});
