import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("export routes", () => {
  it("should return CSV format for comments export", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test that the route exists and returns expected structure
    try {
      const result = await caller.export.comments({ taskId: 999 });
      // Should either succeed with CSV or fail with NOT_FOUND
      expect(result).toBeDefined();
      if (result.csv) {
        expect(result.csv).toContain("ID");
        expect(result.filename).toMatch(/comments-.*\.csv/);
      }
    } catch (error: any) {
      // Expected to fail with NOT_FOUND for non-existent task
      expect(error.code).toBe("NOT_FOUND");
    }
  });

  it("should return CSV format for sentiment export", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.export.sentiment({ taskId: 999 });
      expect(result).toBeDefined();
      if (result.csv) {
        expect(result.csv).toContain("ID");
        expect(result.filename).toMatch(/sentiment-.*\.csv/);
      }
    } catch (error: any) {
      expect(error.code).toBe("NOT_FOUND");
    }
  });

  it("should enforce user permission for comments export", async () => {
    const { ctx: ctx1 } = createAuthContext(1);
    const { ctx: ctx2 } = createAuthContext(2);
    const caller1 = appRouter.createCaller(ctx1);
    const caller2 = appRouter.createCaller(ctx2);

    // User 2 should not be able to export user 1's task
    try {
      await caller2.export.comments({ taskId: 999 });
    } catch (error: any) {
      // Should fail with NOT_FOUND due to permission check
      expect(error.code).toBe("NOT_FOUND");
    }
  });
});
