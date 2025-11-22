import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Tasks Router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createAuthContext();
  });

  it("should create a monitoring task", async () => {
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.create({
      keyword: "测试关键词",
      description: "这是一个测试任务",
      platforms: ["twitter", "weibo"],
    });

    expect(result).toBeDefined();
  });

  it("should list tasks for authenticated user", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create a task first
    await caller.tasks.create({
      keyword: "测试关键词",
      platforms: ["twitter"],
    });

    // List tasks
    const tasks = await caller.tasks.list({ limit: 10, offset: 0 });

    expect(Array.isArray(tasks)).toBe(true);
  });

  it("should get a specific task", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create a task
    const createResult = await caller.tasks.create({
      keyword: "获取测试",
      platforms: ["weibo"],
    });

    // List tasks to get the ID
    const tasks = await caller.tasks.list({ limit: 100, offset: 0 });
    const createdTask = tasks.find(t => t.keyword === "获取测试");

    if (!createdTask) {
      expect.fail("Task not found");
    }

    // Get the task
    const task = await caller.tasks.get({
      taskId: createdTask.id,
    });

    expect(task).toBeDefined();
    expect(task?.keyword).toBe("获取测试");
  });

  it("should not allow accessing other user's tasks", async () => {
    const caller1 = appRouter.createCaller(createAuthContext(1));
    const caller2 = appRouter.createCaller(createAuthContext(2));

    // User 1 creates a task
    await caller1.tasks.create({
      keyword: "用户1的任务",
      platforms: ["twitter"],
    });

    // Get user 1's tasks
    const user1Tasks = await caller1.tasks.list({ limit: 100, offset: 0 });
    const user1Task = user1Tasks.find(t => t.keyword === "用户1的任务");

    if (!user1Task) {
      expect.fail("Task not found");
    }

    // User 2 tries to access it
    try {
      await caller2.tasks.get({
        taskId: user1Task.id,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("NOT_FOUND");
    }
  });

  it("should update task status", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create a task
    await caller.tasks.create({
      keyword: "更新测试",
      platforms: ["zhihu"],
    });

    // Get the task
    const tasks = await caller.tasks.list({ limit: 100, offset: 0 });
    const task = tasks.find(t => t.keyword === "更新测试");

    if (!task) {
      expect.fail("Task not found");
    }

    // Update status
    await caller.tasks.update({
      taskId: task.id,
      status: "paused",
    });

    // Verify update
    const updatedTask = await caller.tasks.get({
      taskId: task.id,
    });

    expect(updatedTask?.status).toBe("paused");
  });
});

describe("Comments Router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createAuthContext();
  });

  it("should list comments for a task", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create a task
    await caller.tasks.create({
      keyword: "评论测试",
      platforms: ["twitter"],
    });

    // Get the task
    const tasks = await caller.tasks.list({ limit: 100, offset: 0 });
    const task = tasks.find(t => t.keyword === "评论测试");

    if (!task) {
      expect.fail("Task not found");
    }

    // List comments
    const comments = await caller.comments.listByTask({
      taskId: task.id,
      limit: 50,
      offset: 0,
    });

    expect(Array.isArray(comments)).toBe(true);
  });

  it("should count comments for a task", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create a task
    await caller.tasks.create({
      keyword: "计数测试",
      platforms: ["weibo"],
    });

    // Get the task
    const tasks = await caller.tasks.list({ limit: 100, offset: 0 });
    const task = tasks.find(t => t.keyword === "计数测试");

    if (!task) {
      expect.fail("Task not found");
    }

    // Count comments
    const count = await caller.comments.countByTask({
      taskId: task.id,
    });

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("should not allow accessing comments from other user's tasks", async () => {
    const caller1 = appRouter.createCaller(createAuthContext(1));
    const caller2 = appRouter.createCaller(createAuthContext(2));

    // User 1 creates a task
    await caller1.tasks.create({
      keyword: "用户1的评论任务",
      platforms: ["twitter"],
    });

    // Get user 1's tasks
    const user1Tasks = await caller1.tasks.list({ limit: 100, offset: 0 });
    const user1Task = user1Tasks.find(t => t.keyword === "用户1的评论任务");

    if (!user1Task) {
      expect.fail("Task not found");
    }

    // User 2 tries to access comments
    try {
      await caller2.comments.listByTask({
        taskId: user1Task.id,
        limit: 50,
        offset: 0,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("NOT_FOUND");
    }
  });
});

describe("Sentiment Router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createAuthContext();
  });

  it("should list sentiment analysis for a task", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create a task
    await caller.tasks.create({
      keyword: "情感测试",
      platforms: ["twitter"],
    });

    // Get the task
    const tasks = await caller.tasks.list({ limit: 100, offset: 0 });
    const task = tasks.find(t => t.keyword === "情感测试");

    if (!task) {
      expect.fail("Task not found");
    }

    // List sentiment analysis
    const sentiments = await caller.sentiment.listByTask({
      taskId: task.id,
    });

    expect(Array.isArray(sentiments)).toBe(true);
  });

  it("should get sentiment stats for a task", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create a task
    await caller.tasks.create({
      keyword: "统计测试",
      platforms: ["weibo"],
    });

    // Get the task
    const tasks = await caller.tasks.list({ limit: 100, offset: 0 });
    const task = tasks.find(t => t.keyword === "统计测试");

    if (!task) {
      expect.fail("Task not found");
    }

    // Get sentiment stats
    const stats = await caller.sentiment.statsByTask({
      taskId: task.id,
    });

    expect(Array.isArray(stats)).toBe(true);
  });

  it("should get sentiment stats with date range", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create a task
    await caller.tasks.create({
      keyword: "日期范围测试",
      platforms: ["zhihu"],
    });

    // Get the task
    const tasks = await caller.tasks.list({ limit: 100, offset: 0 });
    const task = tasks.find(t => t.keyword === "日期范围测试");

    if (!task) {
      expect.fail("Task not found");
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    // Get stats with date range
    const stats = await caller.sentiment.statsByDateRange({
      taskId: task.id,
      startDate,
      endDate,
    });

    expect(Array.isArray(stats)).toBe(true);
  });

  it("should not allow accessing sentiment from other user's tasks", async () => {
    const caller1 = appRouter.createCaller(createAuthContext(1));
    const caller2 = appRouter.createCaller(createAuthContext(2));

    // User 1 creates a task
    await caller1.tasks.create({
      keyword: "用户1的情感任务",
      platforms: ["twitter"],
    });

    // Get user 1's tasks
    const user1Tasks = await caller1.tasks.list({ limit: 100, offset: 0 });
    const user1Task = user1Tasks.find(t => t.keyword === "用户1的情感任务");

    if (!user1Task) {
      expect.fail("Task not found");
    }

    // User 2 tries to access sentiment
    try {
      await caller2.sentiment.listByTask({
        taskId: user1Task.id,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("NOT_FOUND");
    }
  });
});

describe("Auth Router", () => {
  it("should get current user info", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();

    expect(user).toBeDefined();
    expect(user?.id).toBe(ctx.user?.id);
    expect(user?.email).toBe(ctx.user?.email);
  });

  it("should logout successfully", async () => {
    const ctx = createAuthContext();
    const clearedCookies: any[] = [];

    ctx.res = {
      clearCookie: (name: string, options: any) => {
        clearedCookies.push({ name, options });
      },
    } as any;

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});
