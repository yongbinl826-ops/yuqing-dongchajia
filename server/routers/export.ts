import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const exportRouter = router({
  comments: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const task = await db.getMonitoringTaskById(input.taskId);
      if (!task || task.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const commentsList = await db.getCommentsByTaskId(input.taskId, 10000, 0);
      const rows = [
        ["ID", "作者", "平台", "内容", "点赞", "评论", "转发", "采集时间"],
        ...commentsList.map(c => [
          String(c.id),
          c.author,
          c.platform,
          c.content,
          String(c.likes),
          String(c.replies),
          String(c.shares),
          new Date(c.collectedAt).toISOString(),
        ]),
      ];

      const csv = rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ).join("\n");

      return { csv, filename: `comments-${input.taskId}-${Date.now()}.csv` };
    }),

  sentiment: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const task = await db.getMonitoringTaskById(input.taskId);
      if (!task || task.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const sentiments = await db.getSentimentAnalysisByTaskId(input.taskId);
      const rows = [
        ["ID", "评论ID", "情感", "分数", "分析时间"],
        ...sentiments.map(s => [
          String(s.id),
          String(s.comment.id),
          s.sentiment,
          String(parseFloat(s.score).toFixed(4)),
          new Date(s.comment.createdAt).toISOString(),
        ]),
      ];

      const csv = rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ).join("\n");

      return { csv, filename: `sentiment-${input.taskId}-${Date.now()}.csv` };
    }),
});
