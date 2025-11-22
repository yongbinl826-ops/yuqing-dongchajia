CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`platform` varchar(50) NOT NULL,
	`platformId` varchar(255) NOT NULL,
	`author` varchar(255),
	`authorId` varchar(255),
	`content` text NOT NULL,
	`likes` int DEFAULT 0,
	`replies` int DEFAULT 0,
	`shares` int DEFAULT 0,
	`url` varchar(1024),
	`publishedAt` timestamp,
	`collectedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`),
	CONSTRAINT `comments_platformId_unique` UNIQUE(`platformId`)
);
--> statement-breakpoint
CREATE TABLE `crawl_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`platform` varchar(50) NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`totalCollected` int DEFAULT 0,
	`newComments` int DEFAULT 0,
	`duplicates` int DEFAULT 0,
	`errorMessage` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crawl_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`keyword` varchar(255) NOT NULL,
	`description` text,
	`platforms` varchar(255) NOT NULL,
	`status` enum('active','paused','completed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitoring_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sentiment_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commentId` int NOT NULL,
	`sentiment` enum('positive','negative','neutral') NOT NULL,
	`score` decimal(5,4) NOT NULL,
	`confidence` decimal(5,4) NOT NULL,
	`keywords` text,
	`tfidfScores` text,
	`analyzedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sentiment_analysis_id` PRIMARY KEY(`id`),
	CONSTRAINT `sentiment_analysis_commentId_unique` UNIQUE(`commentId`)
);
--> statement-breakpoint
CREATE TABLE `sentiment_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`date` timestamp NOT NULL,
	`totalComments` int DEFAULT 0,
	`positiveCount` int DEFAULT 0,
	`negativeCount` int DEFAULT 0,
	`neutralCount` int DEFAULT 0,
	`averageSentimentScore` decimal(5,4),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sentiment_stats_id` PRIMARY KEY(`id`)
);
