const MATH_SENTINEL = "\u0002MATH";
const MATH_SENTINEL_END = "\u0003";

const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  "n": "ⁿ",
  "i": "ⁱ",
  "a": "ᵃ",
  "b": "ᵇ",
  "c": "ᶜ",
  "d": "ᵈ",
  "e": "ᵉ",
  "f": "ᶠ",
  "g": "ᵍ",
  "h": "ʰ",
  "j": "ʲ",
  "k": "ᵏ",
  "l": "ˡ",
  "m": "ᵐ",
  "o": "ᵒ",
  "p": "ᵖ",
  "r": "ʳ",
  "s": "ˢ",
  "t": "ᵗ",
  "u": "ᵘ",
  "v": "ᵛ",
  "w": "ʷ",
  "x": "ˣ",
  "y": "ʸ",
  "z": "ᶻ",
};

const SUBSCRIPTS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  "a": "ₐ",
  "e": "ₑ",
  "o": "ₒ",
  "x": "ₓ",
  "h": "ₕ",
  "k": "ₖ",
  "l": "ₗ",
  "m": "ₘ",
  "n": "ₙ",
  "p": "ₚ",
  "s": "ₛ",
  "t": "ₜ",
  "i": "ᵢ",
  "j": "ⱼ",
  "r": "ᵣ",
  "u": "ᵤ",
  "v": "ᵥ",
};

const LATEX_TO_UNICODE: [RegExp, string][] = [
  [/\\therefore\b/g, "∴"],
  [/\\notin\b/g, "∉"],
  [/\\in\b/g, "∈"],
  [/\\subseteq\b/g, "⊆"],
  [/\\supseteq\b/g, "⊇"],
  [/\\subset\b/g, "⊂"],
  [/\\supset\b/g, "⊃"],
  [/\\cup\b/g, "∪"],
  [/\\cap\b/g, "∩"],
  [/\\emptyset\b/g, "∅"],
  [/\\varnothing\b/g, "∅"],
  [/\\forall\b/g, "∀"],
  [/\\exists\b/g, "∃"],
  [/\\neg\b/g, "¬"],
  [/\\land\b/g, "∧"],
  [/\\lor\b/g, "∨"],
  [/\\neq\b/g, "≠"],
  [/\\leq\b/g, "≤"],
  [/\\geq\b/g, "≥"],
  [/\\le\b/g, "≤"],
  [/\\ge\b/g, "≥"],
  [/\\approx\b/g, "≈"],
  [/\\equiv\b/g, "≡"],
  [/\\sim\b/g, "∼"],
  [/\\propto\b/g, "∝"],
  [/\\mid\b/g, "|"],
  [/\\cdot\b/g, "·"],
  [/\\times\b/g, "×"],
  [/\\div\b/g, "÷"],
  [/\\pm\b/g, "±"],
  [/\\mp\b/g, "∓"],
  [/\\infty\b/g, "∞"],
  [/\\leftrightarrow\b/g, "↔"],
  [/\\Rightarrow\b/g, "⇒"],
  [/\\Leftarrow\b/g, "⇐"],
  [/\\rightarrow\b/g, "→"],
  [/\\leftarrow\b/g, "←"],
  [/\\mapsto\b/g, "↦"],
  [/\\to\b/g, "→"],
  [/\\sum\b/g, "∑"],
  [/\\int\b/g, "∫"],
  [/\\prod\b/g, "∏"],
  [/\\pi\b/g, "π"],
  [/\\alpha\b/g, "α"],
  [/\\beta\b/g, "β"],
  [/\\gamma\b/g, "γ"],
  [/\\Gamma\b/g, "Γ"],
  [/\\delta\b/g, "δ"],
  [/\\Delta\b/g, "Δ"],
  [/\\theta\b/g, "θ"],
  [/\\Theta\b/g, "Θ"],
  [/\\lambda\b/g, "λ"],
  [/\\mu\b/g, "μ"],
  [/\\sigma\b/g, "σ"],
  [/\\Sigma\b/g, "Σ"],
  [/\\phi\b/g, "φ"],
  [/\\Phi\b/g, "Φ"],
  [/\\omega\b/g, "ω"],
  [/\\Omega\b/g, "Ω"],
  [/\\epsilon\b/g, "ε"],
  [/\\varepsilon\b/g, "ε"],
  [/\\zeta\b/g, "ζ"],
  [/\\eta\b/g, "η"],
  [/\\kappa\b/g, "κ"],
  [/\\rho\b/g, "ρ"],
  [/\\tau\b/g, "τ"],
  [/\\upsilon\b/g, "υ"],
  [/\\chi\b/g, "χ"],
  [/\\psi\b/g, "ψ"],
  [/\\Psi\b/g, "Ψ"],
];

function protectMathSegments(text: string): { text: string; math: string[] } {
  const math: string[] = [];
  let output = text;

  const capture = (match: string): string => {
    math.push(match);
    return `${MATH_SENTINEL}${math.length - 1}${MATH_SENTINEL_END}`;
  };

  output = output.replace(/\$\$[\s\S]*?\$\$/g, capture);
  output = output.replace(/\\\[[\s\S]*?\\\]/g, capture);
  output = output.replace(/\$[^$\n]+?\$/g, capture);
  output = output.replace(/\\\([\s\S]*?\\\)/g, capture);

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

function toSuperscript(inner: string): string {
  const chars = [...inner];
  if (chars.length > 0 && chars.every((c) => SUPERSCRIPTS[c])) {
    return chars.map((c) => SUPERSCRIPTS[c]).join("");
  }
  return `^(${inner})`;
}

function toSubscript(inner: string): string {
  const chars = [...inner];
  if (chars.length > 0 && chars.every((c) => SUBSCRIPTS[c])) {
    return chars.map((c) => SUBSCRIPTS[c]).join("");
  }
  return `_(${inner})`;
}

function convertSuperscripts(input: string): string {
  let out = input.replace(/\^\{([^{}]*)\}/g, (_m, inner: string) => toSuperscript(inner));
  out = out.replace(/\^([0-9a-zA-Z])/g, (_m, ch: string) => SUPERSCRIPTS[ch] ?? `^${ch}`);
  return out;
}

function convertSubscripts(input: string): string {
  let out = input.replace(/\_\{([^{}]*)\}/g, (_m, inner: string) => toSubscript(inner));
  out = out.replace(/\_([0-9a-zA-Z])/g, (_m, ch: string) => SUBSCRIPTS[ch] ?? `_${ch}`);
  return out;
}

/**
 * Normalize common OCR/ASCII approximations and LaTeX commands back into
 * their mathematical Unicode symbols.
 */
export function normalizeMathSymbols(text: string): string {
  let out = text;
  for (const [pattern, replacement] of LATEX_TO_UNICODE) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function convertMathToken(token: string): string {
  let s = token;
  if (s.startsWith("$$") && s.endsWith("$$") && s.length > 4) {
    s = s.slice(2, -2);
  } else if (s.startsWith("$") && s.endsWith("$") && s.length > 2) {
    s = s.slice(1, -1);
  } else if (s.startsWith("\\[") && s.endsWith("\\]")) {
    s = s.slice(2, -2);
  } else if (s.startsWith("\\(") && s.endsWith("\\)")) {
    s = s.slice(2, -2);
  }

  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
  s = s.replace(/\\sqrt\[([^{}]*)\]\{([^{}]*)\}/g, "$1√($2)");
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, "√($1)");
  s = s.replace(/\\begin\{[^{}]*\}/g, "").replace(/\\end\{[^{}]*\}/g, "");
  s = s.replace(/\\text\{([^{}]*)\}/g, "$1");
  s = s.replace(/\\mathrm\{([^{}]*)\}/g, "$1");
  s = s.replace(/\\mathbf\{([^{}]*)\}/g, "$1");
  s = s.replace(/\\mathbb\{([^{}]*)\}/g, "$1");
  s = s.replace(/\\left/g, "").replace(/\\right/g, "");
  s = convertSuperscripts(s);
  s = convertSubscripts(s);
  s = s.replace(/\\[,\;:\!]/g, " ");
  s = s.replace(/\\quad/g, " ").replace(/\\qquad/g, "  ");
  s = s.replace(/\\\{/g, "{").replace(/\\\}/g, "}");
  s = s.replace(/\\%/g, "%");
  s = normalizeMathSymbols(s);
  s = s.replace(/~/g, " ").replace(/&/g, " ");
  return s.replace(/\s+/g, " ").trim();
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

  return restoreMathSegments(out, math.map(convertMathToken));
}
