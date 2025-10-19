import { describe, it, expect } from "bun:test";
import { MemoryOtpRepository } from "./otp";
import { StoreError } from "../../../utils/error";

type TestOtp = {
  id: string;
  hashedOtp: string;
  createdAt: Date;
  attemptCount: number;
  isValid: boolean;
  purpose: string;
};

// deterministic id generator for tests
const makeIdGen = () => {
  let n = 0;
  return () => `otp_${++n}`;
};

const O = (o: Omit<TestOtp, "id"> & { id?: string }): TestOtp => ({
  id: o.id ?? "MISSING",
  hashedOtp: o.hashedOtp,
  createdAt: o.createdAt,
  attemptCount: o.attemptCount,
  isValid: o.isValid,
  purpose: o.purpose,
});

const mapFrom = (otps: TestOtp[]) =>
  new Map<string, TestOtp>(otps.map((o) => [o.id, o]));

function makeRepo(initialOtps: TestOtp[] = []) {
  const generateId = makeIdGen();
  const repo = new MemoryOtpRepository<TestOtp>({
    generateId,
    initialOtps: mapFrom(initialOtps),
  });
  return { repo, generateId };
}

describe("MemoryOtpRepository", () => {
  it("getById returns null for missing records", async () => {
    const { repo } = makeRepo();
    await expect(repo.getById("nope")).resolves.toBeNull();
  });

  it("create assigns deterministic id and freezes the returned object", async () => {
    const { repo } = makeRepo();
    const now = new Date();
    const created = await repo.create({
      hashedOtp: "hashed123",
      createdAt: now,
      attemptCount: 0,
      isValid: true,
      purpose: "login",
    });
    expect(created.id).toBe("otp_1");
    expect(created.hashedOtp).toBe("hashed123");
    expect(created.createdAt).toBe(now);
    expect(created.attemptCount).toBe(0);
    expect(created.isValid).toBe(true);
    expect(created.purpose).toBe("login");
    expect(Object.isFrozen(created)).toBe(true);
  });

  it("getById finds existing OTP", async () => {
    const now = new Date();
    const { repo } = makeRepo([
      O({
        id: "otp_1",
        hashedOtp: "hashed123",
        createdAt: now,
        attemptCount: 0,
        isValid: true,
        purpose: "login",
      }),
    ]);
    await expect(repo.getById("otp_1")).resolves.toMatchObject({
      id: "otp_1",
      hashedOtp: "hashed123",
      createdAt: now,
      attemptCount: 0,
      isValid: true,
      purpose: "login",
    });
  });

  it("update modifies fields and persists to the store", async () => {
    const now = new Date();
    const { repo } = makeRepo([
      O({
        id: "otp_1",
        hashedOtp: "hashed123",
        createdAt: now,
        attemptCount: 0,
        isValid: true,
        purpose: "login",
      }),
    ]);
    const updated = await repo.update("otp_1", {
      attemptCount: 1,
      isValid: false,
    });
    expect(updated).toMatchObject({
      id: "otp_1",
      hashedOtp: "hashed123",
      createdAt: now,
      attemptCount: 1,
      isValid: false,
      purpose: "login",
    });
    // ensure persisted
    await expect(repo.getById("otp_1")).resolves.toMatchObject({
      attemptCount: 1,
      isValid: false,
    });
  });

  it("delete removes from store; missing id throws", async () => {
    const now = new Date();
    const { repo } = makeRepo([
      O({
        id: "otp_1",
        hashedOtp: "hashed123",
        createdAt: now,
        attemptCount: 0,
        isValid: true,
        purpose: "login",
      }),
    ]);
    await repo.delete("otp_1");
    await expect(repo.getById("otp_1")).resolves.toBeNull();

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
    const now = new Date();
    
    await repo.create({
      hashedOtp: "hashed1",
      createdAt: now,
      attemptCount: 0,
      isValid: true,
      purpose: "login",
    }); // otp_1
    await repo.create({
      hashedOtp: "hashed2",
      createdAt: new Date(now.getTime() + 1000),
      attemptCount: 0,
      isValid: true,
      purpose: "login",
    }); // otp_2
    await repo.create({
      hashedOtp: "hashed3",
      createdAt: new Date(now.getTime() + 2000),
      attemptCount: 0,
      isValid: true,
      purpose: "login",
    }); // otp_3

    const p1 = await repo.list(2, 0, "id", "asc");
    expect(p1.items.map((o) => o.id)).toEqual(["otp_1", "otp_2"]);
    expect(p1.meta).toMatchObject({ count: 2, offset: 0, total: 3 });

    const p2 = await repo.list(2, 2, "id", "asc");
    expect(p2.items.map((o) => o.id)).toEqual(["otp_3"]);
    expect(p2.meta).toMatchObject({ count: 1, offset: 2, total: 3 });
  });

  it("list sorts by dates and ties break by id", async () => {
    const baseDate = new Date();
    const { repo } = makeRepo([
      O({
        id: "otp_2",
        hashedOtp: "hash2",
        createdAt: baseDate,
        attemptCount: 1,
        isValid: true,
        purpose: "login",
      }),
      O({
        id: "otp_1",
        hashedOtp: "hash1",
        createdAt: baseDate, // same as otp_2
        attemptCount: 0,
        isValid: true,
        purpose: "login",
      }),
      O({
        id: "otp_3",
        hashedOtp: "hash3",
        createdAt: new Date(baseDate.getTime() - 1000),
        attemptCount: 0,
        isValid: true,
        purpose: "login",
      }),
    ]);

    // By createdAt asc: oldest to newest, ties broken by id
    const byCreatedAtAsc = await repo.list(10, 0, "createdAt", "asc");
    expect(byCreatedAtAsc.items.map((o) => o.id)).toEqual([
      "otp_3",
      "otp_1",
      "otp_2",
    ]);

    // By createdAt desc: newest to oldest, ties broken by id
    const byCreatedAtDesc = await repo.list(10, 0, "createdAt", "desc");
    expect(byCreatedAtDesc.items.map((o) => o.id)).toEqual([
      "otp_2",
      "otp_1",
      "otp_3",
    ]);
  });

  it("returned items are frozen (immutable views)", async () => {
    const now = new Date();
    const { repo } = makeRepo([
      O({
        id: "otp_1",
        hashedOtp: "hash1",
        createdAt: now,
        attemptCount: 0,
        isValid: true,
        purpose: "login",
      }),
      O({
        id: "otp_2",
        hashedOtp: "hash2",
        createdAt: now,
        attemptCount: 0,
        isValid: true,
        purpose: "reset",
      }),
    ]);
    const one = await repo.getById("otp_1");
    expect(one && Object.isFrozen(one)).toBe(true);
    const listed = await repo.list(10, 0);
    for (const item of listed.items) {
      expect(Object.isFrozen(item)).toBe(true);
    }
  });
});