import React from "react";
import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    <img src={typeof src === "string" ? src : ""} alt={alt} {...props} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  ),
}));

// jsdom does not implement scrollTo / matchMedia / clipboard by default.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

window.scrollTo = () => {};

if (!("clipboard" in navigator)) {
  Object.defineProperty(navigator, "clipboard", {
    writable: true,
    value: {
      writeText: vi.fn(() => Promise.resolve()),
    },
  });
}
