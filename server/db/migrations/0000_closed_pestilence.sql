CREATE TABLE `automation_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`is_active` integer DEFAULT true,
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automation_settings_key_unique` ON `automation_settings` (`key`);--> statement-breakpoint
CREATE TABLE `automation_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`trigger_condition` text,
	`message_body` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text
);
--> statement-breakpoint
CREATE TABLE `cash_shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text,
	`opened_by` text,
	`closed_by` text,
	`opened_at` text NOT NULL,
	`closed_at` text,
	`opening_balance` real NOT NULL,
	`closing_balance` real,
	`status` text DEFAULT 'open',
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opened_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cash_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`shift_id` text,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`description` text NOT NULL,
	`payment_method` text,
	`voucher_id` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`shift_id`) REFERENCES `cash_shifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`voucher_id`) REFERENCES `employee_vouchers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `commission_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text,
	`sales_commission_pct` real DEFAULT 0,
	`services_commission_pct` real DEFAULT 0,
	`base_salary` real DEFAULT 0,
	`sales_goal_bonus_pct` real DEFAULT 0,
	`sales_goal_bonus_fixed` real DEFAULT 0,
	`os_goal_bonus_fixed` real DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `credit_card_bill_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`bill_id` text,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`paid_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`bill_id`) REFERENCES `credit_card_bills`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `credit_card_bills` (
	`id` text PRIMARY KEY NOT NULL,
	`unit_id` text,
	`day` integer NOT NULL,
	`description` text NOT NULL,
	`start_month` integer NOT NULL,
	`start_year` integer NOT NULL,
	`total_installments` integer NOT NULL,
	`value` real NOT NULL,
	`category` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`unit_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `credit_queries_history` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`query_type` text NOT NULL,
	`document` text NOT NULL,
	`raw_response` text,
	`performed_by` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`performed_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `customers` (
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
	`approved_for_purchase` integer DEFAULT false,
	`unit_id` text,
	`document_id_url` text,
	`document_address_url` text,
	`document_income_url` text,
	`classification` text DEFAULT 'MEDIO',
	`credit_limit` real DEFAULT 0,
	`credit_status` text DEFAULT 'EM_ANALISE',
	`registration_status` text DEFAULT 'PRE_CADASTRO',
	`responsible_analyst_id` text,
	`needed_credit` real DEFAULT 0,
	`desired_device` text,
	`desired_installment_value` real DEFAULT 0,
	`address_number` text,
	`neighborhood` text,
	`city` text,
	`state` text,
	`rg_frente_url` text,
	`rg_verso_url` text,
	`cnh_frente_url` text,
	`cnh_verso_url` text,
	`self_photo_url` text,
	`asaas_customer_id` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`unit_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` text PRIMARY KEY NOT NULL,
	`column_id` text,
	`customer_id` text,
	`title` text NOT NULL,
	`value` real DEFAULT 0,
	`priority` text DEFAULT 'Media',
	`assigned_to` text,
	`notes` text,
	`status` text DEFAULT 'open',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`column_id`) REFERENCES `kanban_columns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `device_block_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`installment_id` text,
	`customer_id` text,
	`imei` text NOT NULL,
	`action` text NOT NULL,
	`reason` text,
	`success` integer DEFAULT true,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`installment_id`) REFERENCES `installments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `device_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text,
	`sale_id` text,
	`lock_type` text NOT NULL,
	`icloud_email` text,
	`icloud_password` text,
	`icloud_locked` integer DEFAULT false,
	`icloud_lock_confirmed_by` text,
	`icloud_lock_confirmed_at` text,
	`mdm_device_id` text,
	`mdm_locked` integer DEFAULT false,
	`mdm_kiosk_message` text,
	`mdm_last_sync_at` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`icloud_lock_confirmed_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
	`category` text DEFAULT 'smartphone',
	`description` text,
	`short_name` text,
	`supplier` text,
	`purchase_date` text,
	`barcode` text,
	`investor_id` text,
	`prime_profit_share` real DEFAULT 0.6,
	`prime_admin_fee` real DEFAULT 0.1,
	`lot_id` text,
	`trade_in_price` real,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_imei_unique` ON `devices` (`imei`);--> statement-breakpoint
CREATE UNIQUE INDEX `devices_serial_number_unique` ON `devices` (`serial_number`);--> statement-breakpoint
CREATE TABLE `employee_vouchers` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text,
	`unit_id` text,
	`amount` real NOT NULL,
	`payment_method` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`voucher_date` text NOT NULL,
	`shift_id` text,
	`created_by` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shift_id`) REFERENCES `cash_shifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
	`asaas_payment_id` text,
	`asaas_invoice_url` text,
	`asaas_sync_status` text DEFAULT 'synced',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory_audit_items` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text,
	`device_id` text,
	`system_quantity` integer DEFAULT 0,
	`physical_quantity` integer DEFAULT 0,
	`cost_price` real DEFAULT 0,
	`sale_price` real DEFAULT 0,
	`reason` text,
	`adjusted` integer DEFAULT false,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`audit_id`) REFERENCES `inventory_audits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text,
	`created_by` text,
	`status` text DEFAULT 'in_progress',
	`completed_at` text,
	`total_cost_discrepancy` real DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text,
	`action` text NOT NULL,
	`quantity_change` integer,
	`performed_by` text,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`performed_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `investor_quotas` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text,
	`amount` real NOT NULL,
	`quota_rate` real NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text,
	`store_id` text,
	`number` text,
	`series` text,
	`type` text,
	`status` text DEFAULT 'pending',
	`xml` text,
	`pdf` text,
	`client_name` text,
	`value` real DEFAULT 0,
	`tax` real DEFAULT 0,
	`key` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kanban_columns` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`order_index` integer NOT NULL,
	`color` text DEFAULT 'border-white',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text NOT NULL,
	`message` text,
	`source` text DEFAULT 'website',
	`status` text DEFAULT 'new',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text
);
--> statement-breakpoint
CREATE TABLE `local_auth_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `lots` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text
);
--> statement-breakpoint
CREATE TABLE `monthly_financial_forecasts` (
	`id` text PRIMARY KEY NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`store_1_forecast` real DEFAULT 0,
	`store_2_forecast` real DEFAULT 0,
	`fixed_store_expenses` real DEFAULT 0,
	`fixed_personal_expenses` real DEFAULT 0,
	`card_payments_inflow` real DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text
);
--> statement-breakpoint
CREATE TABLE `notification_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`method` text NOT NULL,
	`headers` text NOT NULL,
	`body` text NOT NULL,
	`attempts` integer DEFAULT 0,
	`last_error` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `outsourced_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`os_id` text,
	`partner_shop_name` text NOT NULL,
	`partner_technician_name` text,
	`external_status` text DEFAULT 'sent',
	`external_cost` real DEFAULT 0,
	`tracking_code` text,
	`notes` text,
	`sent_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`returned_at` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`os_id`) REFERENCES `repair_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cnpj` text,
	`phone` text,
	`email` text,
	`address` text,
	`commission_rate` real DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text,
	`email` text,
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
CREATE TABLE `receivable_purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`installment_id` text,
	`profile_id` text,
	`purchase_value` real NOT NULL,
	`expected_return` real NOT NULL,
	`status` text DEFAULT 'approved',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`installment_id`) REFERENCES `installments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `repair_order_parts` (
	`id` text PRIMARY KEY NOT NULL,
	`repair_order_id` text,
	`part_name` text NOT NULL,
	`quantity` integer DEFAULT 1,
	`cost_price` real DEFAULT 0,
	`sale_price` real DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`repair_order_id`) REFERENCES `repair_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `repair_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`technician_id` text,
	`device_model` text NOT NULL,
	`imei` text,
	`problem_description` text NOT NULL,
	`tech_notes` text,
	`estimated_cost` real,
	`final_cost` real,
	`entry_date` text DEFAULT 'CURRENT_TIMESTAMP',
	`exit_date` text,
	`status` text DEFAULT 'pending',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`technician_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
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
	`is_trade_in` integer DEFAULT false,
	`trade_in_device_brand` text,
	`trade_in_device_model` text,
	`trade_in_device_imei` text,
	`trade_in_valuation` real DEFAULT 0,
	`trade_in_sale_price_estimate` real DEFAULT 0,
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
	`chatbot_enabled` integer DEFAULT false,
	`chatbot_prompt` text,
	`chatbot_payment_terms` text,
	`billing_reminder_pre_due_days` integer DEFAULT 5,
	`billing_reminder_pre_due_template` text,
	`billing_reminder_overdue_days` integer DEFAULT 5,
	`billing_reminder_overdue_template` text,
	`billing_reminder_payment_confirmed_template` text,
	`fiscal_api_token` text,
	`fiscal_environment` text DEFAULT 'sandbox',
	`fiscal_gateway` text DEFAULT 'focusnfe',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cnpj` text,
	`phone` text,
	`email` text,
	`address` text,
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
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_id` text,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`installment_id` text,
	`profile_id` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`installment_id`) REFERENCES `installments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text,
	`balance` real DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `withdrawal_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text,
	`amount` real NOT NULL,
	`status` text DEFAULT 'pending',
	`pix_key` text,
	`pix_key_type` text,
	`notes` text,
	`processed_at` text,
	`processed_by` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`sync_status` text DEFAULT 'pending_insert',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_sync_by` text,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`processed_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
