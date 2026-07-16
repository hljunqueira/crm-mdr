PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cpf` text,
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
	`unit_id` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`unit_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_customers`("id", "name", "cpf", "phone", "parent_contact_phone", "reference1_name", "reference1_phone", "reference2_name", "reference2_phone", "email", "address", "status", "notes", "suggested_down_payment", "last_payment_date", "unit_id", "created_at", "sync_status", "updated_at", "last_sync_by") SELECT "id", "name", "cpf", "phone", "parent_contact_phone", "reference1_name", "reference1_phone", "reference2_name", "reference2_phone", "email", "address", "status", "notes", "suggested_down_payment", "last_payment_date", "unit_id", "created_at", "sync_status", "updated_at", "last_sync_by" FROM `customers`;--> statement-breakpoint
DROP TABLE `customers`;--> statement-breakpoint
ALTER TABLE `__new_customers` RENAME TO `customers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;