import { describe, it, expect } from "vitest";
import {
  sanitizeText,
  normalizeMathSymbols,
  extractMath,
  restoreMath,
} from "@/app/lib/text-sanitize";

describe("sanitizeText", () => {
  it("returns empty string for empty/null input", () => {
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
    expect(sanitizeText("")).toBe("");
    expect(sanitizeText("   ")).toBe("");
  });

  it("strips markdown formatting (bold, italic, code, headings, links)", () => {
    const input =
      "**bold** and __underline__ and ~~strike~~ and `code`\n" +
      "# Heading\n" +
      "> quote\n" +
      "[link text](https://example.com)";
    const out = sanitizeText(input);
    expect(out).not.toContain("**");
    expect(out).not.toContain("__");
    expect(out).not.toContain("~~");
    expect(out).not.toContain("`");
    expect(out).not.toContain("#");
    expect(out).not.toContain(">");
    expect(out).not.toContain("[");
    expect(out).not.toContain("https://example.com");
    expect(out).toContain("bold");
    expect(out).toContain("Heading");
  });

  it("collapses 3+ newlines to double newlines", () => {
    expect(sanitizeText("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("converts markdown list dashes to bullet points", () => {
    expect(sanitizeText("- item one\n- item two")).toBe("• item one\n• item two");
  });

  it("removes horizontal rule dashes", () => {
    expect(sanitizeText("text\n---\ntext")).toBe("text\n\ntext");
  });
});

describe("sanitizeText math → Unicode conversion", () => {
  it("converts the real-world group theory example verbatim", () => {
    const input =
      "Theorem (Reversal Property): Let $(G, *)$ be a group and let $a, b \\in G$. Then, $(a * b)^{-1} = b^{-1} * a^{-1}$\n" +
      "$\\therefore$ we have to show that $(a * b)^{-1} \\in G$ is $b^{-1} * a^{-1}$\n" +
      "$$(a * b) * (b^{-1} * a^{-1}) = a * b * b^{-1} * a^{-1}$$";

    const out = sanitizeText(input);

    expect(out).toContain("(G, *)");
    expect(out).toContain("a, b ∈ G");
    expect(out).toContain("(a * b)⁻¹ = b⁻¹ * a⁻¹");
    expect(out).toContain("∴ we have to show");
    expect(out).toContain("(a * b)⁻¹ ∈ G");
    expect(out).not.toContain("$");
    expect(out).not.toContain("\\in");
    expect(out).not.toContain("\\therefore");
  });

  it("converts \\le to ≤", () => {
    expect(sanitizeText("$H \\le (G, *)$")).toContain("H ≤ (G, *)");
  });

  it("converts fractions", () => {
    expect(sanitizeText("$$\\frac{a}{b}$$")).toContain("(a)/(b)");
  });

  it("converts superscripts and subscripts", () => {
    const out = sanitizeText("$x^{n} + x^2 + e^{-x} + a_{1}$");
    expect(out).toContain("xⁿ");
    expect(out).toContain("x²");
    expect(out).toContain("e⁻ˣ");
    expect(out).toContain("a₁");
  });

  it("preserves absolute-value bars", () => {
    const out = sanitizeText("the value $|x|$ and $|-3|$");
    expect(out).toContain("|x|");
    expect(out).toContain("|-3|");
  });

  it("converts square root and indexed roots", () => {
    expect(sanitizeText("$\\sqrt{x}$")).toContain("√(x)");
    expect(sanitizeText("$\\sqrt[3]{y}$")).toContain("3√(y)");
  });

  it("converts Greek letters and common symbols", () => {
    expect(sanitizeText("$\\pi \\alpha \\theta \\Delta$")).toContain("π α θ Δ");
    expect(sanitizeText("$\\sum_{i=1}^{n}$")).toContain("∑");
    expect(sanitizeText("$\\infty$")).toContain("∞");
    expect(sanitizeText("$\\times$")).toContain("×");
    expect(sanitizeText("$\\neq$")).toContain("≠");
    expect(sanitizeText("$\\cdot$")).toContain("·");
  });

  it("removes \\left/\\right and \\text wrappers", () => {
    expect(sanitizeText("$\\left( x \\right)$")).toContain("( x )");
    expect(sanitizeText("$\\text{hello world}$")).toContain("hello world");
  });

  it("handles display math blocks", () => {
    const out = sanitizeText("$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$");
    expect(out).toContain("√");
    expect(out).toContain("±");
    expect(out).not.toContain("$$");
  });
});

describe("normalizeMathSymbols", () => {
  it("replaces latex commands with unicode", () => {
    const out = normalizeMathSymbols(
      "\\alpha \\beta \\gamma \\leq \\geq \\neq \\times \\div \\pm \\infty \\rightarrow",
    );
    expect(out).toContain("α");
    expect(out).toContain("β");
    expect(out).toContain("≤");
    expect(out).toContain("≥");
    expect(out).toContain("≠");
    expect(out).toContain("×");
    expect(out).toContain("÷");
    expect(out).toContain("±");
    expect(out).toContain("∞");
    expect(out).toContain("→");
  });

  it("leaves plain text untouched", () => {
    expect(normalizeMathSymbols("hello world 123")).toBe("hello world 123");
  });
});

describe("extractMath / restoreMath round-trip", () => {
  it("round-trips protected math segments", () => {
    const input = "inline $a^2$ and display $$\\int_0^1 x dx$$ and bars $|v|$";
    const { text, math } = extractMath(input);
    const restored = restoreMath(text, math);
    expect(restored).toBe(input);
  });
});
