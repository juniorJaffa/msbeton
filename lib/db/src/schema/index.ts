import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const adminConfig = pgTable("admin_config", {
  key: text("key").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AdminConfigRow = typeof adminConfig.$inferSelect;
export type InsertAdminConfig = typeof adminConfig.$inferInsert;