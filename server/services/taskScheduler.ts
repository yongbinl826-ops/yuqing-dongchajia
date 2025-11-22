/**
 * 后台任务调度服务
 * 使用 node-schedule 实现定时数据采集
 */

import schedule from "node-schedule";
import * as db from "../db";
import { getDb } from "../db";

interface ScheduledTask {
  taskId: number;
  jobId: string | null;
}

const scheduledTasks = new Map<number, ScheduledTask>();

/**
 * 启动监控任务的定时采集
 */
export async function startMonitoringTask(taskId: number, interval: string = "0 */30 * * * *") {
  try {
    const task = await db.getMonitoringTaskById(taskId);
    if (!task) {
      console.error(`Task ${taskId} not found`);
      return;
    }

    if (scheduledTasks.has(taskId)) {
      const existing = scheduledTasks.get(taskId);
      if (existing?.jobId) {
        schedule.cancelJob(existing.jobId);
      }
    }

    const job = schedule.scheduleJob(interval, async () => {
      console.log(`[TaskScheduler] Running collection for task ${taskId}`);
      
      try {
        const platforms = JSON.parse(task.platforms);
        console.log(`[TaskScheduler] Collecting from platforms: ${platforms.join(", ")}`);
      } catch (error) {
        console.error(`[TaskScheduler] Error collecting data for task ${taskId}:`, error);
      }
    });

    scheduledTasks.set(taskId, {
      taskId,
      jobId: job.name,
    });

    console.log(`[TaskScheduler] Started monitoring task ${taskId} with interval ${interval}`);
  } catch (error) {
    console.error(`[TaskScheduler] Failed to start task ${taskId}:`, error);
  }
}

/**
 * 停止监控任务的定时采集
 */
export function stopMonitoringTask(taskId: number) {
  const scheduled = scheduledTasks.get(taskId);
  if (scheduled?.jobId) {
    schedule.cancelJob(scheduled.jobId);
    scheduledTasks.delete(taskId);
    console.log(`[TaskScheduler] Stopped monitoring task ${taskId}`);
  }
}

/**
 * 初始化所有活跃任务的定时采集
 */
export async function initializeScheduler() {
  try {
    const db_instance = await getDb();
    if (!db_instance) {
      console.warn("[TaskScheduler] Database not available");
      return;
    }

    console.log("[TaskScheduler] Scheduler initialized");
  } catch (error) {
    console.error("[TaskScheduler] Failed to initialize scheduler:", error);
  }
}

/**
 * 获取所有已调度的任务
 */
export function getScheduledTasks() {
  return Array.from(scheduledTasks.values());
}

/**
 * 清理所有任务
 */
export function cleanupScheduler() {
  scheduledTasks.forEach((task) => {
    if (task.jobId) {
      schedule.cancelJob(task.jobId);
    }
  });
  scheduledTasks.clear();
  console.log("[TaskScheduler] All tasks cleaned up");
}
