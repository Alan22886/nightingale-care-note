CREATE TABLE `ai_scribed_notes` (
	`care_entry_id` text PRIMARY KEY NOT NULL,
	`interaction_type` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`redaction_event_id` text NOT NULL,
	`source_session_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`from_version` integer,
	`to_version` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `care_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`author_role` text NOT NULL,
	`author_id` text NOT NULL,
	`entry_type` text NOT NULL,
	`visibility` text NOT NULL,
	`current_version` integer DEFAULT 1 NOT NULL,
	`trust_state` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clinic_importance_weights` (
	`clinic_id` text NOT NULL,
	`category` text NOT NULL,
	`multiplier` real DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_clinic_category` ON `clinic_importance_weights` (`clinic_id`,`category`);--> statement-breakpoint
CREATE TABLE `clinics` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`parent_id` text,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `entry_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`version` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`actor_id` text NOT NULL,
	`reverted_from` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_entry_versions_entry_version` ON `entry_versions` (`entry_id`,`version`);--> statement-breakpoint
CREATE TABLE `highlights` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`severity` text NOT NULL,
	`status` text NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`base_score` real NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `importance_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`highlight_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`category` text NOT NULL,
	`action` text NOT NULL,
	`signal` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`name` text NOT NULL,
	`date_of_birth` text NOT NULL,
	`summary` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`patient_id` text
);
--> statement-breakpoint
CREATE TABLE `provenance_spans` (
	`id` text PRIMARY KEY NOT NULL,
	`highlight_id` text NOT NULL,
	`source_entry_id` text NOT NULL,
	`source_version_id` text NOT NULL,
	`start_offset` integer NOT NULL,
	`end_offset` integer NOT NULL,
	`source_excerpt` text NOT NULL,
	`source_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `redaction_events` (
	`id` text PRIMARY KEY NOT NULL,
	`categories` text NOT NULL,
	`provider` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`source_entry_id` text,
	`title` text NOT NULL,
	`owner_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
