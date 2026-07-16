CREATE TABLE `local_auth_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
