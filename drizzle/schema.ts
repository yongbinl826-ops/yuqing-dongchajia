import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, index } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Export all types for convenience
 */
export type * from "drizzle-orm/mysql-core";

/**
 * Monitoring tasks created by users to track specific keywords/topics
 */
export const monitoringTasks = mysqlTable("monitoring_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  description: text("description"),
  platforms: varchar("platforms", { length: 255 }).notNull(), // JSON: ["twitter", "weibo", "zhihu"]
  status: mysqlEnum("status", ["active", "paused", "completed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [{
  userIdIdx: index("userId_idx").on(table.userId),
}]);

export type MonitoringTask = typeof monitoringTasks.$inferSelect;
export type InsertMonitoringTask = typeof monitoringTasks.$inferInsert;

/**
 * Comments/posts collected from various platforms
 */
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(), // twitter, weibo, zhihu
  platformId: varchar("platformId", { length: 255 }).notNull().unique(), // unique ID from platform
  author: varchar("author", { length: 255 }),
  authorId: varchar("authorId", { length: 255 }),
  content: text("content").notNull(),
  likes: int("likes").default(0),
  replies: int("replies").default(0),
  shares: int("shares").default(0),
  url: varchar("url", { length: 1024 }),
  publishedAt: timestamp("publishedAt"),
  collectedAt: timestamp("collectedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [{
  taskIdIdx: index("taskId_idx").on(table.taskId),
  platformIdx: index("platform_idx").on(table.platform),
  publishedAtIdx: index("publishedAt_idx").on(table.publishedAt),
}]);

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

/**
 * Sentiment analysis results for comments
 */
export const sentimentAnalysis = mysqlTable("sentiment_analysis", {
  id: int("id").autoincrement().primaryKey(),
  commentId: int("commentId").notNull().unique(),
  sentiment: mysqlEnum("sentiment", ["positive", "negative", "neutral"]).notNull(),
  score: decimal("score", { precision: 5, scale: 4 }).notNull(), // 0.0000 to 1.0000
  confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
  keywords: text("keywords"), // JSON array of extracted keywords
  tfidfScores: text("tfidfScores"), // JSON object of keyword -> TF-IDF score
  analyzedAt: timestamp("analyzedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [{
  commentIdIdx: index("commentId_idx").on(table.commentId),
  sentimentIdx: index("sentiment_idx").on(table.sentiment),
}]);

export type SentimentAnalysis = typeof sentimentAnalysis.$inferSelect;
export type InsertSentimentAnalysis = typeof sentimentAnalysis.$inferInsert;

/**
 * Daily sentiment statistics for trend analysis
 */
export const sentimentStats = mysqlTable("sentiment_stats", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  date: timestamp("date").notNull(), // UTC date
  totalComments: int("totalComments").default(0),
  positiveCount: int("positiveCount").default(0),
  negativeCount: int("negativeCount").default(0),
  neutralCount: int("neutralCount").default(0),
  averageSentimentScore: decimal("averageSentimentScore", { precision: 5, scale: 4 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [{
  taskIdIdx: index("taskId_idx").on(table.taskId),
  dateIdx: index("date_idx").on(table.date),
}]);

export type SentimentStats = typeof sentimentStats.$inferSelect;
export type InsertSentimentStats = typeof sentimentStats.$inferInsert;

/**
 * Crawling jobs and their status
 */
export const crawlJobs = mysqlTable("crawl_jobs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  totalCollected: int("totalCollected").default(0),
  newComments: int("newComments").default(0),
  duplicates: int("duplicates").default(0),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [{
  taskIdIdx: index("taskId_idx").on(table.taskId),
  statusIdx: index("status_idx").on(table.status),
}]);

export type CrawlJob = typeof crawlJobs.$inferSelect;
export type InsertCrawlJob = typeof crawlJobs.$inferInsert;

/**
 * Relations for type safety
 */
export const usersRelations = relations(users, ({ many }) => ({
  monitoringTasks: many(monitoringTasks),
}));

export const monitoringTasksRelations = relations(monitoringTasks, ({ one, many }) => ({
  user: one(users, {
    fields: [monitoringTasks.userId],
    references: [users.id],
  }),
  comments: many(comments),
  sentimentStats: many(sentimentStats),
  crawlJobs: many(crawlJobs),
}));

export const commentsRelations = relations(comments, ({ one, one: oneAnalysis }) => ({
  task: one(monitoringTasks, {
    fields: [comments.taskId],
    references: [monitoringTasks.id],
  }),
  sentimentAnalysis: oneAnalysis(sentimentAnalysis, {
    fields: [comments.id],
    references: [sentimentAnalysis.commentId],
  }),
}));

export const sentimentAnalysisRelations = relations(sentimentAnalysis, ({ one }) => ({
  comment: one(comments, {
    fields: [sentimentAnalysis.commentId],
    references: [comments.id],
  }),
}));