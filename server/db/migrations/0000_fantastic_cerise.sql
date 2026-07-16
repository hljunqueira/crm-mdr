CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cpf` text NOT NULL,
	`phone` text,
	`parent_contact_phone` text,
	`reference1_name` text,
	`reference1_phone` text,
	`reference2_name` text,
	`reference2_phone` text,
	`email` text,
	`address` text,
	`status` text DEFAULT 'active',
	`notes` text,
	`suggested_down_payment` real DEFAULT 0,
	`last_payment_date` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_cpf_unique` ON `customers` (`cpf`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text,
	`model` text NOT NULL,
	`brand` text NOT NULL,
	`imei` text,
	`serial_number` text,
	`condition` text,
	`cost_price` real NOT NULL,
	`sale_price` real NOT NULL,
	`stock_quantity` integer DEFAULT 1,
	`status` text DEFAULT 'available',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_imei_unique` ON `devices` (`imei`);--> statement-breakpoint
CREATE UNIQUE INDEX `devices_serial_number_unique` ON `devices` (`serial_number`);--> statement-breakpoint
CREATE TABLE `installments` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text,
	`installment_number` integer NOT NULL,
	`total_installments` integer NOT NULL,
	`value` real NOT NULL,
	`due_date` text NOT NULL,
	`payment_date` text,
	`status` text DEFAULT 'pending',
	`payment_method` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text,
	`full_name` text,
	`avatar_url` text,
	`role` text DEFAULT 'attendant',
	`active` integer DEFAULT true,
	`password_hash` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text,
	`customer_id` text,
	`seller_id` text,
	`device_id` text,
	`device_model_manual` text,
	`imei_manual` text,
	`total_value` real NOT NULL,
	`down_payment` real DEFAULT 0,
	`installments_count` integer DEFAULT 1,
	`service_fee` real DEFAULT 0,
	`original_price` real DEFAULT 0,
	`sale_date` text DEFAULT 'CURRENT_DATE',
	`status` text DEFAULT 'completed',
	`payment_type` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seller_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cnpj` text,
	`address` text,
	`phone` text,
	`evolution_api_url` text,
	`evolution_api_key` text,
	`evolution_instance` text,
	`logo_url` text,
	`theme_color` text DEFAULT '#4BE277',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_name` text NOT NULL,
	`action` text NOT NULL,
	`record_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
