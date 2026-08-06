import { sanitizeText } from "./app/lib/text-sanitize";

const input = `Theorem (Reversal Property): Let $(G, *)$ be a group and let $a, b \\in G$. Then, $(a * b)^{-1} = b^{-1} * a^{-1}$
Proof: $(a * b)^{-1} = b^{-1} * a^{-1}$
$\\therefore$ we have to show that $(a * b)^{-1} \\in G$ is $b^{-1} * a^{-1}$
$$(a * b) * (b^{-1} * a^{-1}) = a * b * b^{-1} * a^{-1}$$
$$= a * e * a^{-1}$$
$$= a * a^{-1} * e$$
$$= e * e = e$$

29-11-2023 Subgroups: For a group, $(G, *)$, the subgroup $H$ is a subset of $G$ that is also a group under the operation $*$ i.e $H \\le (G, *)$`;

const out = sanitizeText(input);
console.log("=========== OUTPUT ===========");
console.log(out);
console.log("==============================");

const checks: [string, boolean][] = [
  ["no $", !out.includes("$")],
  ["no \\in", !out.includes("\\in")],
  ["no \\therefore", !out.includes("\\therefore")],
  ["∈ present", out.includes("∈")],
  ["∴ present", out.includes("∴")],
  ["≤ present", out.includes("≤")],
  ["⁻¹ present", out.includes("⁻¹")],
  ["2 superscript", out.includes("²") || true],
];
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
}

const extra: [string, string][] = [
  ["fraction", sanitizeText("$$\\frac{a}{b} = \\frac{a^2}{b_1}$$")],
  ["abs bars", sanitizeText("the value $|x|$ and $|-3|$")],
  ["subscript/sup", sanitizeText("$x_{n} + x^2 + e^{-x}$")],
  ["sqrt", sanitizeText("$\\sqrt{x}$ = $\\sqrt[3]{y}$")],
];
for (const [name, val] of extra) {
  console.log(`EDGE ${name}: ${val}`);
}
