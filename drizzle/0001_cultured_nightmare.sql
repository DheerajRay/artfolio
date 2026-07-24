ALTER TABLE `artworks` ADD `critique` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `artworks` ADD `classification_json` text DEFAULT '{}' NOT NULL;