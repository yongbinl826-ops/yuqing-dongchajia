import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { collectorRouter } from "./routers/collector";
import { analysisRouter } from "./routers/analysis";
import { exportRouter } from "./routers/export";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { eq, desc, count } from "drizzle-orm";

export const appRouter = router({
  collector: collectorRouter,
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  analysis: analysisRouter,
  export: exportRouter,

  tasks: router({
    create: publicProcedure
      .input(z.object({
        keyword: z.string(),
        platforms: z.array(z.enum(["twitter", "reddit", "youtube"])),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const userId = ctx.user?.id || 1; // 使用默认用户ID
          const now = new Date();
          const task = await db.createMonitoringTask({
            userId,
            keyword: input.keyword,
            platforms: JSON.stringify(input.platforms),
            description: input.description || "",
            status: "active",
            createdAt: now,
            updatedAt: now,
          });
          return task;
        } catch (error) {
          console.error("[Tasks] Failed to create task:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }),

    list: publicProcedure
      .input(z.object({
        limit: z.number().default(10),
        offset: z.number().default(0),
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user?.id || 1;
        const tasks = await db.getMonitoringTasksByUserId(userId);
        return tasks ? tasks.slice(input.offset, input.offset + input.limit) : [];
      }),

    get: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await db.getMonitoringTaskById(input.taskId);
        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }
        return task;
      }),

    update: publicProcedure
      .input(z.object({
        taskId: z.number(),
        status: z.enum(["active", "paused", "completed"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const task = await db.getMonitoringTaskById(input.taskId);
        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        if (input.status) {
          await db.updateMonitoringTask(input.taskId, { status: input.status });
        }

        return { success: true };
      }),
  }),

  comments: router({
    listByTask: publicProcedure
      .input(z.object({
        taskId: z.number(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }))
      .query(async ({ ctx, input }) => {
        const task = await db.getMonitoringTaskById(input.taskId);
        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        const comments = await db.getCommentsByTaskId(input.taskId);
        return comments ? comments.slice(input.offset, input.offset + input.limit) : [];
      }),

    countByTask: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await db.getMonitoringTaskById(input.taskId);
        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        const comments = await db.getCommentsByTaskId(input.taskId);
        return comments.length;
      }),
  }),

  sentiment: router({
    listByTask: publicProcedure
      .input(z.object({
        taskId: z.number(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }))
      .query(async ({ ctx, input }) => {
        const task = await db.getMonitoringTaskById(input.taskId);
        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        const sentiments = await db.getSentimentAnalysisByTaskId(input.taskId);
        return sentiments ? sentiments.slice(input.offset, input.offset + input.limit) : [];
      }),

    statsByTask: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await db.getMonitoringTaskById(input.taskId);
        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        const stats = await db.getSentimentStatsByTaskId(input.taskId);
        return stats;
      }),

    statsByDateRange: publicProcedure
      .input(z.object({
        taskId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        const task = await db.getMonitoringTaskById(input.taskId);
        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        const stats = await db.getSentimentStatsByTaskId(input.taskId);
        return stats.filter(s => {
          const date = new Date(s.date);
          return date >= input.startDate && date <= input.endDate;
        });
      }),

    stats: publicProcedure
      .input(z.object({
        taskId: z.number(),
        days: z.number().default(7),
      }))
      .query(async ({ ctx, input }) => {
        const task = await db.getMonitoringTaskById(input.taskId);
        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);

        const stats = await db.getSentimentStatsByTaskId(input.taskId, startDate, endDate);
        return stats;
      }),
  }),
});

export type AppRouter = typeof appRouter;
