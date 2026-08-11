import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/docs/route";

describe("GET /api/docs", () => {
  it("returns an html page with the OpenAPI spec", async () => {
    const res = await GET();
    expect(res.headers.get("Content-Type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("SwaggerUIBundle");
    expect(html).toContain("Compadre API");
    expect(html).toContain("/api/ocr");
    expect(html).toContain("/api/documents");
    expect(html).toContain("/api/docs");
    expect(html).toContain("/api/auth/sign-in/email");
  });
});
