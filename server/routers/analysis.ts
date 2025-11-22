/**
 * NLP 分析路由
 * 处理情感分析、关键词提取等 NLP 任务
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

export const analysisRouter = router({
  /**
   * 批量分析评论的情感
   */
  analyzeSentiments: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        commentIds: z.array(z.number()).optional(),
        limit: z.number().default(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 验证任务所有权
        const task = await db.getMonitoringTaskById(input.taskId);
        if (!task || task.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        // 获取评论数据
        let comments = await db.getCommentsByTaskId(input.taskId);

        if (input.commentIds && input.commentIds.length > 0) {
          comments = comments.filter(c => input.commentIds!.includes(c.id));
        }

        if (comments.length === 0) {
          return {
            success: true,
            analyzed: 0,
            results: [],
          };
        }

        // 这里应该调用 Python NLP 服务进行批量分析
        // 临时使用模拟数据
        const sentiments = comments.map(comment => {
          const sentimentOptions = ["positive", "negative", "neutral"] as const;
          return {
            commentId: comment.id,
            sentiment: sentimentOptions[Math.floor(Math.random() * 3)],
            score: Math.random().toString(),
            confidence: 0.8 + Math.random() * 0.2,
            analyzedAt: new Date(),
          };
        });

        // 保存分析结果到数据库
        for (const result of sentiments) {
          await db.createSentimentAnalysis({
            commentId: result.commentId,
            sentiment: result.sentiment,
            score: result.score,
            confidence: result.confidence.toString(),
            analyzedAt: result.analyzedAt,
          });
        }

        return {
          success: true,
          analyzed: sentiments.length,
          results: sentiments,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to analyze sentiments",
        });
      }
    }),

  /**
   * 提取评论中的关键词
   */
  extractKeywords: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        topK: z.number().default(30),
        limit: z.number().default(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 验证任务所有权
        const task = await db.getMonitoringTaskById(input.taskId);
        if (!task || task.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        // 获取评论数据
        const comments = await db.getCommentsByTaskId(input.taskId);

        if (comments.length === 0) {
          return {
            success: true,
            keywords: [],
          };
        }

        // 这里应该调用 Python NLP 服务进行关键词提取
        // 临时使用模拟数据
        const mockKeywords = [
          { word: "产品", frequency: 245, tfidf: 0.85 },
          { word: "服务", frequency: 198, tfidf: 0.78 },
          { word: "用户", frequency: 156, tfidf: 0.72 },
          { word: "体验", frequency: 142, tfidf: 0.68 },
          { word: "功能", frequency: 128, tfidf: 0.65 },
          { word: "价格", frequency: 115, tfidf: 0.62 },
          { word: "质量", frequency: 98, tfidf: 0.58 },
          { word: "支持", frequency: 87, tfidf: 0.55 },
          { word: "问题", frequency: 76, tfidf: 0.52 },
          { word: "改进", frequency: 65, tfidf: 0.48 },
        ].slice(0, input.topK);

        return {
          success: true,
          keywords: mockKeywords,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to extract keywords",
        });
      }
    }),

  /**
   * 获取分析进度
   */
  getAnalysisProgress: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // 验证任务所有权
        const task = await db.getMonitoringTaskById(input.taskId);
        if (!task || task.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        // 获取总评论数
        const allComments = await db.getCommentsByTaskId(input.taskId);
        const totalComments = allComments.length;

        // 获取已分析评论数
        const stats = await db.getSentimentStatsByTaskId(input.taskId);
        const analyzedComments = stats.reduce((sum, s) => sum + (s.totalComments || 0), 0);

        const progress = totalComments > 0 ? (analyzedComments / totalComments) * 100 : 0;

        return {
          taskId: input.taskId,
          totalComments,
          analyzedComments,
          progress: Math.round(progress),
          status: progress === 100 ? "completed" : "analyzing",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get analysis progress",
        });
      }
    }),

  /**
   * 获取情感分析统计
   */
  getSentimentStats: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // 验证任务所有权
        const task = await db.getMonitoringTaskById(input.taskId);
        if (!task || task.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        // 获取情感统计
        let stats = await db.getSentimentStatsByTaskId(input.taskId);

        // 按日期筛选
        if (input.startDate || input.endDate) {
          stats = stats.filter(s => {
            const date = new Date(s.date);
            if (input.startDate && date < input.startDate) return false;
            if (input.endDate && date > input.endDate) return false;
            return true;
          });
        }

        return {
          taskId: input.taskId,
          stats: stats.map(s => ({
            date: s.date,
            positive: s.positiveCount || 0,
            negative: s.negativeCount || 0,
            neutral: s.neutralCount || 0,
            total: s.totalComments || 0,
          })),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get sentiment stats",
        });
      }
    }),

  /**
   * 对比两个时间段的情感分析
   */
  compareSentiments: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        period1Start: z.date(),
        period1End: z.date(),
        period2Start: z.date(),
        period2End: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // 验证任务所有权
        const task = await db.getMonitoringTaskById(input.taskId);
        if (!task || task.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        // 获取两个时间段的统计数据
        const allStats = await db.getSentimentStatsByTaskId(input.taskId);

        const period1 = allStats.filter(s => {
          const date = new Date(s.date);
          return date >= input.period1Start && date <= input.period1End;
        });

        const period2 = allStats.filter(s => {
          const date = new Date(s.date);
          return date >= input.period2Start && date <= input.period2End;
        });

        // 计算聚合统计
        const calculateStats = (stats: typeof allStats) => {
          const total = stats.reduce((sum, s) => sum + (s.totalComments || 0), 0);
          const positive = stats.reduce((sum, s) => sum + (s.positiveCount || 0), 0);
          const negative = stats.reduce((sum, s) => sum + (s.negativeCount || 0), 0);
          const neutral = stats.reduce((sum, s) => sum + (s.neutralCount || 0), 0);

          return {
            total,
            positive,
            negative,
            neutral,
            positiveRate: total > 0 ? (positive / total) * 100 : 0,
            negativeRate: total > 0 ? (negative / total) * 100 : 0,
            neutralRate: total > 0 ? (neutral / total) * 100 : 0,
          };
        };

        const stats1 = calculateStats(period1);
        const stats2 = calculateStats(period2);

        return {
          taskId: input.taskId,
          period1: {
            start: input.period1Start,
            end: input.period1End,
            ...stats1,
          },
          period2: {
            start: input.period2Start,
            end: input.period2End,
            ...stats2,
          },
          comparison: {
            positiveChange: stats2.positiveRate - stats1.positiveRate,
            negativeChange: stats2.negativeRate - stats1.negativeRate,
            neutralChange: stats2.neutralRate - stats1.neutralRate,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to compare sentiments",
        });
      }
    }),
});
