CREATE TABLE `brand_palettes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`background` text NOT NULL,
	`colors_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `brand_palettes_owner_updated_idx` ON `brand_palettes` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `project_versions` (
	`project_id` text NOT NULL,
	`version_no` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	`label` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`project_id`, `version_no`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_owner_updated_idx` ON `projects` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `share_links` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`created_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `share_links_token_hash_idx` ON `share_links` (`token_hash`);