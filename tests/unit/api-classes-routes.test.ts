import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    classMember: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    class: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/app/lib/require-auth", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/app/lib/class-code", () => ({
  generateClassCode: vi.fn(() => "ABC123"),
}));

import prisma from "@/lib/prisma";
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

  it("lists the classes the user belongs to", async () => {
    vi.mocked(prisma.classMember.findMany).mockResolvedValue([
      {
        userId: "u1",
        role: "owner",
        classId: "c1",
        createdAt: new Date("2026-01-01"),
        class: {
          id: "c1",
          name: "Physics 101",
          code: "ABC123",
          description: "Intro physics",
          ownerId: "u1",
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
          owner: { name: "Alice" },
          members: [{ userId: "u1" }, { userId: "u2" }],
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
      ownerName: "Alice",
      memberCount: 2,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("returns 500 on failure", async () => {
    vi.mocked(prisma.classMember.findMany).mockRejectedValue(new Error("db down"));
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

  it("creates the class and owner membership in a transaction", async () => {
    const created = {
      id: "c1",
      name: "Chem 101",
      code: "ABC123",
      description: null,
      ownerId: "u1",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      return fn({ ...prisma, class: prisma.class } as never);
    });
    vi.mocked(prisma.class.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.class.create).mockResolvedValue(created as never);

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
    expect(prisma.class.create).toHaveBeenCalledWith({
      data: { name: "Chem 101", code: "ABC123", description: null, ownerId: "u1" },
    });
    expect(prisma.classMember.create).toHaveBeenCalledWith({
      data: { userId: "u1", classId: "c1", role: "owner" },
    });
  });

  it("regenerates the code when a collision is found", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      return fn({ ...prisma, class: prisma.class } as never);
    });
    vi.mocked(generateClassCode)
      .mockReturnValueOnce("ABC123")
      .mockReturnValueOnce("XYZ789");
    vi.mocked(prisma.class.findUnique)
      .mockResolvedValueOnce({ id: "taken" } as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.class.create).mockResolvedValue({
      id: "c1",
      name: "Chem",
      code: "XYZ789",
      description: null,
      ownerId: "u1",
    } as never);

    const res = await createPost(
      new Request("http://localhost/api/classes", {
        method: "POST",
        body: JSON.stringify({ name: "Chem" }),
      }),
    );
    expect(res.status).toBe(201);
    expect(generateClassCode).toHaveBeenCalledTimes(2);
  });

  it("returns 500 on failure", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("db down"));
    const res = await createPost(
      new Request("http://localhost/api/classes", {
        method: "POST",
        body: JSON.stringify({ name: "Chem" }),
      }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("db down");
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

  it("searches by name or code excluding the user's own classes", async () => {
    vi.mocked(prisma.classMember.findMany).mockResolvedValue([
      { userId: "u1", classId: "mine" },
    ] as never);
    vi.mocked(prisma.class.findMany).mockResolvedValue([
      {
        id: "c1",
        name: "Math 101",
        code: "MATH1",
        description: null,
        ownerId: "u2",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        owner: { name: "Bob" },
        members: [{ userId: "u2" }, { userId: "u3" }],
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
        ownerName: "Bob",
        memberCount: 2,
      },
    ]);
    expect(prisma.class.findMany).toHaveBeenCalledWith(
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

  it("returns 500 on failure", async () => {
    vi.mocked(prisma.classMember.findMany).mockRejectedValue(new Error("db down"));
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

  it("returns 404 when the class does not exist", async () => {
    vi.mocked(prisma.class.findUnique).mockResolvedValue(null);
    const res = await joinPost(new Request("http://localhost/api/classes/nope/join"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 when already a member", async () => {
    vi.mocked(prisma.class.findUnique).mockResolvedValue({
      id: "c1",
      name: "Math",
      code: "MATH1",
      description: null,
      members: [{ userId: "u1" }],
    } as never);
    const res = await joinPost(new Request("http://localhost/api/classes/c1/join"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(409);
    expect(prisma.classMember.create).not.toHaveBeenCalled();
  });

  it("adds the user as a member", async () => {
    vi.mocked(prisma.class.findUnique).mockResolvedValue({
      id: "c1",
      name: "Math",
      code: "MATH1",
      description: "Numbers",
      members: [{ userId: "u2" }],
    } as never);
    vi.mocked(prisma.classMember.create).mockResolvedValue({} as never);

    const res = await joinPost(new Request("http://localhost/api/classes/c1/join"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      class: { id: "c1", name: "Math", code: "MATH1", description: "Numbers", role: "member" },
    });
    expect(prisma.classMember.create).toHaveBeenCalledWith({
      data: { userId: "u1", classId: "c1", role: "member" },
    });
  });

  it("returns 500 on failure", async () => {
    vi.mocked(prisma.class.findUnique).mockRejectedValue(new Error("db down"));
    const res = await joinPost(new Request("http://localhost/api/classes/c1/join"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(500);
  });
});
