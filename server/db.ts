import { eq, desc, and, gte, lte, count, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, monitoringTasks, comments, sentimentAnalysis, sentimentStats, crawlJobs, InsertMonitoringTask, InsertComment, InsertSentimentAnalysis, InsertSentimentStats, InsertCrawlJob } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== Monitoring Tasks ====================

export async function createMonitoringTask(task: InsertMonitoringTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(monitoringTasks).values(task);
  return result;
}

export async function getMonitoringTasksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(monitoringTasks).where(eq(monitoringTasks.userId, userId)).orderBy(desc(monitoringTasks.createdAt));
}

export async function getMonitoringTaskById(taskId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(monitoringTasks).where(eq(monitoringTasks.id, taskId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateMonitoringTask(taskId: number, updates: Partial<InsertMonitoringTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(monitoringTasks).set(updates).where(eq(monitoringTasks.id, taskId));
}

// ==================== Comments ====================

export async function createComment(comment: InsertComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(comments).values(comment);
}

export async function getCommentsByTaskId(taskId: number, limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(comments)
    .where(eq(comments.taskId, taskId))
    .orderBy(desc(comments.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function getCommentById(commentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCommentByPlatformId(platformId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(comments).where(eq(comments.platformId, platformId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCommentCountByTaskId(taskId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(comments).where(eq(comments.taskId, taskId));
  return result[0]?.count || 0;
}

// ==================== Sentiment Analysis ====================

export async function createSentimentAnalysis(analysis: InsertSentimentAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(sentimentAnalysis).values(analysis);
}

export async function getSentimentAnalysisByCommentId(commentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sentimentAnalysis).where(eq(sentimentAnalysis.commentId, commentId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSentimentAnalysisByTaskId(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: sentimentAnalysis.id,
    sentiment: sentimentAnalysis.sentiment,
    score: sentimentAnalysis.score,
    confidence: sentimentAnalysis.confidence,
    keywords: sentimentAnalysis.keywords,
    tfidfScores: sentimentAnalysis.tfidfScores,
    comment: comments,
  })
  .from(sentimentAnalysis)
  .innerJoin(comments, eq(sentimentAnalysis.commentId, comments.id))
  .where(eq(comments.taskId, taskId))
  .orderBy(desc(sentimentAnalysis.analyzedAt));
}

// ==================== Sentiment Stats ====================

export async function createSentimentStats(stats: InsertSentimentStats) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(sentimentStats).values(stats);
}

export async function getSentimentStatsByTaskId(taskId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  if (startDate && endDate) {
    return await db.select().from(sentimentStats)
      .where(and(eq(sentimentStats.taskId, taskId), gte(sentimentStats.date, startDate), lte(sentimentStats.date, endDate)))
      .orderBy(sentimentStats.date);
  }
  
  return await db.select().from(sentimentStats)
    .where(eq(sentimentStats.taskId, taskId))
    .orderBy(sentimentStats.date);
}

// ==================== Crawl Jobs ====================

export async function createCrawlJob(job: InsertCrawlJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(crawlJobs).values(job);
}

export async function getCrawlJobsByTaskId(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(crawlJobs).where(eq(crawlJobs.taskId, taskId)).orderBy(desc(crawlJobs.createdAt));
}

export async function updateCrawlJob(jobId: number, updates: Partial<InsertCrawlJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(crawlJobs).set(updates).where(eq(crawlJobs.id, jobId));
}

export async function getActiveCrawlJobs() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(crawlJobs).where(eq(crawlJobs.status, "running"));
}

// ==================== Additional Helper Functions ====================

export async function getCrawlJobProgress(taskId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(crawlJobs)
    .where(eq(crawlJobs.taskId, taskId))
    .orderBy(desc(crawlJobs.updatedAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCommentCountByTask(taskId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(comments).where(eq(comments.taskId, taskId));
  return result[0]?.count || 0;
}

export async function aggregateSentimentStats(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 按日期聚合情感分析结果
  const result = await db.execute(`
    INSERT INTO sentiment_stats (task_id, date, positive_count, neutral_count, negative_count, created_at)
    SELECT 
      c.task_id,
      DATE(c.published_at) as date,
      SUM(CASE WHEN sa.sentiment = 'positive' THEN 1 ELSE 0 END) as positive_count,
      SUM(CASE WHEN sa.sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral_count,
      SUM(CASE WHEN sa.sentiment = 'negative' THEN 1 ELSE 0 END) as negative_count,
      NOW() as created_at
    FROM comments c
    INNER JOIN sentiment_analysis sa ON c.id = sa.comment_id
    WHERE c.task_id = ?
    GROUP BY c.task_id, DATE(c.published_at)
    ON DUPLICATE KEY UPDATE
      positive_count = VALUES(positive_count),
      neutral_count = VALUES(neutral_count),
      negative_count = VALUES(negative_count),
      updated_at = NOW()
  `, [taskId]);
  
  return result;
}
