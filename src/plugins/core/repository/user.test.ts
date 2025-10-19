import { describe, it, expect } from "bun:test";
import { MemoryUserRepository } from "./user";
import { StoreError } from "../../../utils/error";

type TestUser = {
  id: string;
  email: string;
  name?: string | null;
  age?: number | null;
};

// deterministic id generator for tests
const makeIdGen = () => {
  let n = 0;
  return () => `u_${++n}`;
};

const U = (u: Omit<TestUser, "id"> & { id?: string }): TestUser => ({
  id: u.id ?? "MISSING",
  email: u.email,
  name: u.name ?? null,
  age: u.age ?? null,
});

const mapFrom = (users: TestUser[]) =>
  new Map<string, TestUser>(users.map((u) => [u.id, u]));

function makeRepo(initialUsers: TestUser[] = []) {
  const generateId = makeIdGen();
  const repo = new MemoryUserRepository<TestUser>({
    generateId,
    initialUsers: mapFrom(initialUsers),
  });
  return { repo, generateId };
}

describe("MemoryUserRepository", () => {
  it("getById/getByEmail return null for missing records", async () => {
    const { repo } = makeRepo();
    await expect(repo.getById("nope")).resolves.toBeNull();
    await expect(repo.getByEmail("nobody@example.com")).resolves.toBeNull();
  });

  it("create assigns deterministic id and freezes the returned object", async () => {
    const { repo } = makeRepo();
    const created = await repo.create({
      email: "a@example.com",
      name: "A",
      age: 1,
    });
    expect(created.id).toBe("u_1");
    expect(created.email).toBe("a@example.com");
    expect(Object.isFrozen(created)).toBe(true);
  });

  it("rejects duplicate emails (case-insensitive) on create", async () => {
    const { repo } = makeRepo([
      U({ id: "u_1", email: "User@Example.com", name: "X" }),
    ]);
    await expect(
      repo.create({ email: "user@example.com", name: "Y" })
    ).rejects.toMatchObject({ code: "unique-violation" });
    await expect(
      repo.create({ email: "USER@EXAMPLE.COM", name: "Z" })
    ).rejects.toBeInstanceOf(StoreError);
  });

  it("getById/getByEmail find existing user (email lookup is case-insensitive)", async () => {
    const { repo } = makeRepo([
      U({ id: "u_1", email: "a@example.com", name: "A" }),
    ]);
    await expect(repo.getById("u_1")).resolves.toMatchObject({
      id: "u_1",
      email: "a@example.com",
    });
    await expect(repo.getByEmail("A@EXAMPLE.COM")).resolves.toMatchObject({
      id: "u_1",
    });
  });

  it("update modifies fields and persists to the store", async () => {
    const { repo } = makeRepo([
      U({ id: "u_1", email: "a@example.com", name: "A", age: 1 }),
    ]);
    const updated = await repo.update("u_1", { name: "A+", age: 2 });
    expect(updated).toMatchObject({ id: "u_1", name: "A+", age: 2 });
    // ensure persisted
    await expect(repo.getById("u_1")).resolves.toMatchObject({
      name: "A+",
      age: 2,
    });
  });

  it("update rejects duplicate email (case-insensitive) and keeps index intact on failure", async () => {
    const { repo } = makeRepo([
      U({ id: "u_1", email: "a@example.com" }),
      U({ id: "u_2", email: "b@example.com" }),
    ]);
    await expect(
      repo.update("u_2", { email: "A@Example.com" })
    ).rejects.toMatchObject({ code: "unique-violation" });

    // original records still retrievable by their original emails
    await expect(repo.getByEmail("a@example.com")).resolves.toMatchObject({
      id: "u_1",
    });
    await expect(repo.getByEmail("b@example.com")).resolves.toMatchObject({
      id: "u_2",
    });
  });

  it("update allows email change that normalizes to the same key (case change only)", async () => {
    const { repo } = makeRepo([U({ id: "u_1", email: "a@example.com" })]);
    const updated = await repo.update("u_1", { email: "A@Example.Com" });
    expect(updated.email).toBe("A@Example.Com"); // preserves caller's case
    // lookup works by normalized key
    await expect(repo.getByEmail("a@example.com")).resolves.toMatchObject({
      id: "u_1",
    });
  });

  it("delete removes from store and email index; missing id throws", async () => {
    const { repo } = makeRepo([U({ id: "u_1", email: "a@example.com" })]);
    await repo.delete("u_1");
    await expect(repo.getById("u_1")).resolves.toBeNull();
    await expect(repo.getByEmail("a@example.com")).resolves.toBeNull();

    await expect(repo.delete("nope")).rejects.toMatchObject({
      code: "entry-not-found",
    });
  });

  it("list enforces non-negative pagination params", async () => {
    const { repo } = makeRepo();
    await expect(repo.list(-1, 0)).rejects.toMatchObject({
      code: "invalid-input",
    });
    await expect(repo.list(1, -5)).rejects.toMatchObject({
      code: "invalid-input",
    });
  });

  it("list paginates correctly", async () => {
    const { repo } = makeRepo();
    await repo.create({ email: "a@example.com", name: "A" }); // u_1
    await repo.create({ email: "b@example.com", name: "B" }); // u_2
    await repo.create({ email: "c@example.com", name: "C" }); // u_3

    const p1 = await repo.list(2, 0, "id", "asc");
    expect(p1.items.map((u) => u.id)).toEqual(["u_1", "u_2"]);
    expect(p1.meta).toMatchObject({ count: 2, offset: 0, total: 3 });

    const p2 = await repo.list(2, 2, "id", "asc");
    expect(p2.items.map((u) => u.id)).toEqual(["u_3"]);
    expect(p2.meta).toMatchObject({ count: 1, offset: 2, total: 3 });
  });

  it("list sorts by numeric/string keys using Intl.Collator (numeric-aware) and ties break by id", async () => {
    const { repo } = makeRepo([
      U({ id: "u_2", email: "user10@example.com", name: "user10", age: 5 }),
      U({ id: "u_1", email: "user2@example.com", name: "user2", age: 5 }), // same age as u_2
      U({ id: "u_3", email: "user1@example.com", name: "user1", age: 1 }),
    ]);

    // By name asc, numeric-aware: user1, user2, user10
    const byName = await repo.list(10, 0, "name", "asc");
    expect(byName.items.map((u) => u.name)).toEqual([
      "user1",
      "user2",
      "user10",
    ]);

    // By age asc: 1, 5, 5 — ties broken by id asc (u_1 before u_2)
    const byAgeAsc = await repo.list(10, 0, "age", "asc");
    expect(byAgeAsc.items.map((u) => u.id)).toEqual(["u_3", "u_1", "u_2"]);

    // By age desc: 5, 5, 1 — ties broken by id desc (u_2 before u_1)
    const byAgeDesc = await repo.list(10, 0, "age", "desc");
    expect(byAgeDesc.items.map((u) => u.id)).toEqual(["u_2", "u_1", "u_3"]);
  });

  it("list sorts with nulls first (as implemented)", async () => {
    const { repo } = makeRepo([
      U({ id: "u_1", email: "a@example.com", name: null }),
      U({ id: "u_2", email: "b@example.com", name: "Bee" }),
    ]);
    const res = await repo.list(10, 0, "name", "asc");
    expect(res.items.map((u) => u.id)).toEqual(["u_1", "u_2"]); // null first
  });

  it("returned items are frozen (immutable views)", async () => {
    const { repo } = makeRepo([
      U({ id: "u_1", email: "a@example.com", name: "A" }),
      U({ id: "u_2", email: "b@example.com", name: "B" }),
    ]);
    const one = await repo.getById("u_1");
    expect(one && Object.isFrozen(one)).toBe(true);
    const listed = await repo.list(10, 0);
    for (const item of listed.items) {
      expect(Object.isFrozen(item)).toBe(true);
    }
  });

  it("constructor rejects initialUsers with duplicate normalized emails", () => {
    const dupA = U({ id: "x1", email: "User@Example.com" });
    const dupB = U({ id: "x2", email: "user@example.com" });
    expect(
      () =>
        new MemoryUserRepository<TestUser>({
          generateId: makeIdGen(),
          initialUsers: mapFrom([dupA, dupB]),
        })
    ).toThrowError();
  });
});
