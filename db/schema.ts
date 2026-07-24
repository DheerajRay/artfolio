import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const artworks = sqliteTable("artworks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  critique: text("critique").notNull().default(""),
  classificationJson: text("classification_json").notNull().default("{}"),
  artworkDate: text("artwork_date").notNull(),
  year: text("year").notNull(),
  medium: text("medium").notNull(),
  background: text("background").notNull(),
  foreground: text("foreground").notNull(),
  objectKey: text("object_key").notNull(),
  mimeType: text("mime_type").notNull(),
  originalName: text("original_name").notNull(),
  createdAt: text("created_at").notNull(),
});
