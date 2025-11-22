import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
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
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Collector Router", () => {
  it("should start collection for a task", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 首先创建一个任务
    const task = await caller.tasks.create({
      keyword: "测试关键词",
      platforms: ["twitter", "weibo"],
    });

    // 获取任务列表以确认 ID
    const tasks = await caller.tasks.list({ limit: 10, offset: 0 });
    const createdTask = tasks.find(t => t.keyword === "测试关键词");
    expect(createdTask).toBeDefined();

    // 启动采集
    const result = await caller.collector.startCollection({
      taskId: createdTask!.id,
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("数据采集已启动");
  });

  it("should stop collection for a task", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 首先创建一个任务
    await caller.tasks.create({
      keyword: "测试停止",
      platforms: ["twitter"],
    });

    // 获取任务列表
    const tasks = await caller.tasks.list({ limit: 10, offset: 0 });
    const createdTask = tasks.find(t => t.keyword === "测试停止");
    expect(createdTask).toBeDefined();

    // 停止采集
    const result = await caller.collector.stopCollection({
      taskId: createdTask!.id,
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("数据采集已停止");
  });

  it("should get collection progress", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 首先创建一个任务
    await caller.tasks.create({
      keyword: "测试进度",
      platforms: ["weibo", "zhihu"],
    });

    // 获取任务列表
    const tasks = await caller.tasks.list({ limit: 10, offset: 0 });
    const createdTask = tasks.find(t => t.keyword === "测试进度");
    expect(createdTask).toBeDefined();

    // 查询进度
    const progress = await caller.collector.getProgress({
      taskId: createdTask!.id,
    });

    expect(progress.taskId).toBe(createdTask!.id);
    expect(progress).toHaveProperty("status");
    expect(progress).toHaveProperty("totalComments");
    expect(progress).toHaveProperty("processedComments");
    expect(progress).toHaveProperty("progress");
  });

  it("should not allow starting collection for other user's tasks", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 创建一个任务
    await caller.tasks.create({
      keyword: "测试权限",
      platforms: ["twitter"],
    });

    // 获取任务列表
    const tasks = await caller.tasks.list({ limit: 10, offset: 0 });
    const task = tasks.find(t => t.keyword === "测试权限");
    expect(task).toBeDefined();

    // 创建另一个用户的 context
    const otherUserCtx: TrpcContext = {
      user: {
        id: 999,
        openId: "other-user",
        email: "other@example.com",
        name: "Other User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const otherCaller = appRouter.createCaller(otherUserCtx);

    // 尝试启动其他用户的任务
    await expect(
      otherCaller.collector.startCollection({
        taskId: task.id,
      })
    ).rejects.toThrow("无权访问此任务");
  });
});
