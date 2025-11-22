import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getMonitoringTaskById,
  updateMonitoringTask,
  getCrawlJobProgress,
  getCommentCountByTask,
} from "../db";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const collectorRouter = router({
  /**
   * 开始数据采集
   */
  startCollection: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 获取任务信息
      const task = await getMonitoringTaskById(input.taskId);
      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "任务不存在",
        });
      }
      
      // 如果用户已登录，验证任务所有权；如果是游客，允许访问
      if (ctx.user && task.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "无权访问此任务",
        });
      }

      // 更新任务状态为活跃
      await updateMonitoringTask(input.taskId, { status: "active" });

      // 为每个平台启动爬虫
      const platforms = (typeof task.platforms === 'string' ? JSON.parse(task.platforms) : task.platforms) as string[];

      for (const platform of platforms) {
        // 启动爬虫进程
        startCrawler(input.taskId, platform, task.keyword);
      }

      return {
        success: true,
        message: "数据采集已启动",
      };
    }),

  /**
   * 停止数据采集
   */
  stopCollection: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 获取任务信息
      const task = await getMonitoringTaskById(input.taskId);
      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "任务不存在",
        });
      }
      
      // 如果用户已登录，验证任务所有权；如果是游客，允许访问
      if (ctx.user && task.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "无权访问此任务",
        });
      }

      // 更新任务状态为暂停
      await updateMonitoringTask(input.taskId, { status: "paused" });

      return {
        success: true,
        message: "数据采集已停止",
      };
    }),

  /**
   * 获取采集进度
   */
  getProgress: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      // 获取任务信息
      const task = await getMonitoringTaskById(input.taskId);
      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "任务不存在",
        });
      }
      
      // 如果用户已登录，验证任务所有权；如果是游客，允许访问
      if (ctx.user && task.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "无权访问此任务",
        });
      }

      // 查询爬虫任务进度
      const crawlProgress = await getCrawlJobProgress(input.taskId);
      const totalComments = await getCommentCountByTask(input.taskId);
      
      const collectedCount = crawlProgress?.collectedCount || 0;
      const processedCount = crawlProgress?.processedCount || 0;
      const progress = collectedCount > 0 ? (processedCount / collectedCount) * 100 : 0;
      
      return {
        taskId: input.taskId,
        status: crawlProgress?.status || task.status,
        totalComments: totalComments,
        collectedCount: collectedCount,
        processedComments: processedCount,
        progress: Math.round(progress),
      };
    }),
});

/**
 * 启动爬虫进程
 */
function startCrawler(
  taskId: number,
  platform: string,
  keyword: string
) {
  // 使用模拟数据演示脚本（因为Twitter API限制）
  // 使用绝对路径来定位脚本
  // 当前工作目录是 /home/ubuntu/yuqing_dongchajia
  const scriptPath = path.join(
    process.cwd(),
    "server",
    "collectors",
    "demo_with_mock_data.py"
  );
  console.log(`[Collector] Script path: ${scriptPath}`);

  const pythonProcess = spawn("python3", [
    scriptPath,
    "--task-id",
    taskId.toString(),
    "--keyword",
    keyword,
    "--count",
    "20",  // 每个平台20条数据
  ]);

  pythonProcess.stdout.on("data", (data) => {
    console.log(`[${platform}] ${data.toString()}`);
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error(`[${platform}] Error: ${data.toString()}`);
  });

  pythonProcess.on("close", (code) => {
    if (code === 0) {
      console.log(`[${platform}] Process completed successfully`);
    } else {
      console.error(`[${platform}] Process exited with code ${code}`);
    }
  });

  pythonProcess.on("error", (err) => {
    console.error(`[${platform}] Failed to start process: ${err.message}`);
  });
}
