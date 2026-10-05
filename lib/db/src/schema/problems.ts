import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const problemsTable = pgTable("agriconnect_problems", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  farmerId: text("farmer_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  crop: text("crop").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProblemSchema = createInsertSchema(problemsTable).omit({ createdAt: true });
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Problem = typeof problemsTable.$inferSelect;
