const MATH_SENTINEL = "\u0002MATH";
const MATH_SENTINEL_END = "\u0003";

function protectMathSegments(text: string): { text: string; math: string[] } {
  const math: string[] = [];
  let output = text;

  const capture = (match: string): string => {
    math.push(match);
    return `${MATH_SENTINEL}${math.length - 1}${MATH_SENTINEL_END}`;
  };

  // Display math $$...$$ (may span lines)
  output = output.replace(/\$\$[\s\S]*?\$\$/g, capture);
  // LaTeX display \[ ... \]
  output = output.replace(/\\\[[\s\S]*?\\\]/g, capture);
  // Inline math $...$ (single line)
  output = output.replace(/\$[^$\n]+?\$/g, capture);
  // LaTeX inline \( ... \)
  output = output.replace(/\\\([\s\S]*?\\\)/g, capture);

  // Absolute value / norm bars |x| — hug their content (no space inside the
  // bars). Markdown table cells typically have spaces (`| a | b |`), so a
  // pipe immediately followed by a non-space character is treated as math.
  output = output.replace(/\|([^|\s][^|]*?)\|/g, (_m, inner: string) => {
    math.push(`|${inner}|`);
    return `${MATH_SENTINEL}${math.length - 1}${MATH_SENTINEL_END}`;
  });

  return { text: output, math };
}

function restoreMathSegments(text: string, math: string[]): string {
  return text.replace(
    new RegExp(`${MATH_SENTINEL}(\\d+)${MATH_SENTINEL_END}`, "g"),
    (_m, index: string) => math[Number(index)] ?? "",
  );
}

/**
 * Extract math expressions (LaTeX $...$ / $$...$$ / \(...\) / \[...\] and
 * |...| absolute-value bars) out of a block of text so that downstream
 * markdown sanitization cannot mangle them. Returns the placeholder text and
 * the ordered list of extracted math tokens.
 */
export function extractMath(text: string): { text: string; math: string[] } {
  return protectMathSegments(text);
}

/**
 * Re-insert math tokens extracted by extractMath back into placeholder text.
 */
export function restoreMath(text: string, math: string[]): string {
  return restoreMathSegments(text, math);
}

/**
 * Normalize common OCR/ASCII approximations back into their mathematical
 * symbols while leaving already-correct Unicode symbols untouched.
 */
export function normalizeMathSymbols(text: string): string {
  return text
    .replace(/\\times\b/g, "×")
    .replace(/\\div\b/g, "÷")
    .replace(/\\pm\b/g, "±")
    .replace(/\\sqrt\b/g, "√")
    .replace(/\\infty\b/g, "∞")
    .replace(/\\le\b/g, "≤")
    .replace(/\\ge\b/g, "≥")
    .replace(/\\neq\b/g, "≠")
    .replace(/\\rightarrow\b/g, "→")
    .replace(/\\leftarrow\b/g, "←")
    .replace(/\\sum\b/g, "∑")
    .replace(/\\int\b/g, "∫")
    .replace(/\\pi\b/g, "π")
    .replace(/\\alpha\b/g, "α")
    .replace(/\\beta\b/g, "β")
    .replace(/\\theta\b/g, "θ")
    .replace(/\\mu\b/g, "μ")
    .replace(/\\sigma\b/g, "σ")
    .replace(/\\lambda\b/g, "λ")
    .replace(/\\Delta\b/g, "Δ")
    .replace(/\\Omega\b/g, "Ω");
}

export function sanitizeText(raw: string | null | undefined): string {
  if (!raw) return "";

  const { text, math } = protectMathSegments(raw);

  const out = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`{1,3}[^`\n]+`{1,3}/g, (m) => m.replace(/`/g, ""))
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "• ")
    .replace(/^\d+[.)]\s+/gm, (m) => m.replace(/^\d+[.)]\s+/, "  "))
    .replace(/^---+$/gm, "")
    .replace(/\|(.+?)\|/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^={3,}$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return restoreMathSegments(out, math);
}
