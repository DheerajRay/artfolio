CREATE TABLE `artworks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`artwork_date` text NOT NULL,
	`year` text NOT NULL,
	`medium` text NOT NULL,
	`background` text NOT NULL,
	`foreground` text NOT NULL,
	`object_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`original_name` text NOT NULL,
	`created_at` text NOT NULL
);
