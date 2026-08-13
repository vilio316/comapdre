import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    member: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      createOrganization: vi.fn(),
    },
  },
}));

vi.mock("@/app/lib/require-auth", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/app/lib/class-code", () => ({
  generateClassCode: vi.fn(() => "ABC123"),
}));

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSessionUser } from "@/app/lib/require-auth";
import { generateClassCode } from "@/app/lib/class-code";
import { GET as listGet, POST as createPost } from "@/app/api/classes/route";
import { GET as searchGet } from "@/app/api/classes/search/route";
import { POST as joinPost } from "@/app/api/classes/[id]/join/route";

const user = { id: "u1", email: "a@b.c", name: "Alice" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSessionUser).mockResolvedValue(user as never);
});

describe("GET /api/classes", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await listGet(new Request("http://localhost/api/classes"));
    expect(res.status).toBe(401);
  });

  it("lists the classes (organizations) the user belongs to", async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      {
        userId: "u1",
        role: "owner",
        organizationId: "c1",
        createdAt: new Date("2026-01-01"),
        organization: {
          id: "c1",
          name: "Physics 101",
          slug: "ABC123",
          description: "Intro physics",
          createdAt: new Date("2026-01-01"),
          members: [
            { userId: "u1", role: "class_rep", user: { name: "Alice" } },
            { userId: "u2", role: "member", user: { name: "Bob" } },
          ],
        },
      },
    ] as never);

    const res = await listGet(new Request("http://localhost/api/classes"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.classes).toHaveLength(1);
    expect(body.classes[0]).toEqual({
      id: "c1",
      name: "Physics 101",
      code: "ABC123",
      description: "Intro physics",
      role: "owner",
      classRepName: "Alice",
      memberCount: 2,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("returns 500 on failure", async () => {
    vi.mocked(prisma.member.findMany).mockRejectedValue(new Error("db down"));
    const res = await listGet(new Request("http://localhost/api/classes"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("db down");
  });
});

describe("POST /api/classes", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await createPost(
      new Request("http://localhost/api/classes", {
        method: "POST",
        body: JSON.stringify({ name: "Chem" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const res = await createPost(
      new Request("http://localhost/api/classes", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Class name is required");
  });

  it("returns 400 for non-string name", async () => {
    const res = await createPost(
      new Request("http://localhost/api/classes", {
        method: "POST",
        body: JSON.stringify({ name: 42 }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for name longer than 100 chars", async () => {
    const res = await createPost(
      new Request("http://localhost/api/classes", {
        method: "POST",
        body: JSON.stringify({ name: "x".repeat(101) }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("creates the class via the organization plugin", async () => {
    vi.mocked(auth.api.createOrganization).mockResolvedValue({
      id: "c1",
      name: "Chem 101",
      slug: "ABC123",
      description: null,
    } as never);

    const res = await createPost(
      new Request("http://localhost/api/classes", {
        method: "POST",
        body: JSON.stringify({ name: "Chem 101" }),
      }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      class: { id: "c1", name: "Chem 101", code: "ABC123", description: null },
    });
    expect(auth.api.createOrganization).toHaveBeenCalledWith({
      body: { name: "Chem 101", slug: "ABC123" },
      headers: expect.any(Headers),
    });
  });

  it("includes the description in the organization payload", async () => {
    vi.mocked(auth.api.createOrganization).mockResolvedValue({
      id: "c1",
      name: "Chem 101",
      slug: "ABC123",
      description: "Intro chem",
    } as never);

    const res = await createPost(
      new Request("http://localhost/api/classes", {
        method: "POST",
        body: JSON.stringify({ name: "Chem 101", description: "Intro chem" }),
      }),
    );
    expect(res.status).toBe(201);
    expect(auth.api.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { name: "Chem 101", slug: "ABC123", description: "Intro chem" },
      }),
    );
  });

  it("regenerates the slug when a collision is found", async () => {
    vi.mocked(auth.api.createOrganization)
      .mockRejectedValueOnce(new Error("Slug is already used"))
      .mockResolvedValueOnce({
        id: "c1",
        name: "Chem",
        slug: "XYZ789",
        description: null,
      } as never);
    vi.mocked(generateClassCode)
      .mockReturnValueOnce("ABC123")
      .mockReturnValueOnce("XYZ789");

    const res = await createPost(
      new Request("http://localhost/api/classes", {
        method: "POST",
        body: JSON.stringify({ name: "Chem" }),
      }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      class: { id: "c1", name: "Chem", code: "XYZ789", description: null },
    });
    expect(generateClassCode).toHaveBeenCalledTimes(2);
  });

  it("returns 400 when the plugin rejects after retries", async () => {
    vi.mocked(auth.api.createOrganization).mockRejectedValue(
      new Error("Some other plugin error"),
    );
    const res = await createPost(
      new Request("http://localhost/api/classes", {
        method: "POST",
        body: JSON.stringify({ name: "Chem" }),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Some other plugin error");
  });

  it("returns 400 when slug collisions exhaust retries", async () => {
    vi.mocked(generateClassCode).mockImplementation(() => "ABC123");
    vi.mocked(auth.api.createOrganization).mockRejectedValue(
      new Error("Slug is already used"),
    );
    const res = await createPost(
      new Request("http://localhost/api/classes", {
        method: "POST",
        body: JSON.stringify({ name: "Chem" }),
      }),
    );
    expect(res.status).toBe(400);
    expect(generateClassCode).toHaveBeenCalledTimes(10);
  });
});

describe("GET /api/classes/search", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await searchGet(new Request("http://localhost/api/classes/search?q=math"));
    expect(res.status).toBe(401);
  });

  it("returns empty when query is blank", async () => {
    const res = await searchGet(new Request("http://localhost/api/classes/search?q="));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ classes: [] });
  });

  it("returns 400 for overlong queries", async () => {
    const res = await searchGet(
      new Request(`http://localhost/api/classes/search?q=${"x".repeat(101)}`),
    );
    expect(res.status).toBe(400);
  });

  it("searches by name or code excluding the user's own organizations", async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      { userId: "u1", organizationId: "mine" },
    ] as never);
    vi.mocked(prisma.organization.findMany).mockResolvedValue([
      {
        id: "c1",
        name: "Math 101",
        slug: "MATH1",
        description: null,
        members: [
          { role: "class_rep", user: { name: "Bob" } },
          { role: "member", user: { name: "Carol" } },
        ],
      },
    ] as never);

    const res = await searchGet(new Request("http://localhost/api/classes/search?q=math"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.classes).toEqual([
      {
        id: "c1",
        name: "Math 101",
        code: "MATH1",
        description: null,
        classRepName: "Bob",
        memberCount: 2,
      },
    ]);
    expect(prisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { OR: expect.any(Array) },
            { id: { notIn: ["mine"] } },
          ],
        },
        take: 20,
      }),
    );
  });

  it("does not exclude organizations when the user has none", async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);

    const res = await searchGet(new Request("http://localhost/api/classes/search?q=math"));
    expect(res.status).toBe(200);
    expect(prisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ OR: expect.any(Array) }] },
      }),
    );
  });

  it("returns 500 on failure", async () => {
    vi.mocked(prisma.member.findMany).mockRejectedValue(new Error("db down"));
    const res = await searchGet(new Request("http://localhost/api/classes/search?q=math"));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/classes/[id]/join", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await joinPost(new Request("http://localhost/api/classes/c1/join"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the organization does not exist", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);
    const res = await joinPost(new Request("http://localhost/api/classes/nope/join"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 when already a member", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: "c1",
      name: "Math",
      slug: "MATH1",
      description: null,
      members: [{ userId: "u1" }],
    } as never);
    const res = await joinPost(new Request("http://localhost/api/classes/c1/join"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(409);
    expect(prisma.member.create).not.toHaveBeenCalled();
  });

  it("adds the user as a member", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: "c1",
      name: "Math",
      slug: "MATH1",
      description: "Numbers",
      members: [{ userId: "u2" }],
    } as never);
    vi.mocked(prisma.member.create).mockResolvedValue({} as never);

    const res = await joinPost(new Request("http://localhost/api/classes/c1/join"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      class: { id: "c1", name: "Math", code: "MATH1", description: "Numbers", role: "member" },
    });
    expect(prisma.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          id: expect.stringMatching(/^mem_[0-9a-f]{32}$/),
          userId: "u1",
          organizationId: "c1",
          role: "member",
        },
      }),
    );
  });

  it("returns 500 on failure", async () => {
    vi.mocked(prisma.organization.findUnique).mockRejectedValue(new Error("db down"));
    const res = await joinPost(new Request("http://localhost/api/classes/c1/join"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(500);
  });
});
