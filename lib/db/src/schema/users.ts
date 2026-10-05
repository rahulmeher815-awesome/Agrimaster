import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, real, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const usersTable = pgTable("agriconnect_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  location: text("location").notNull().default(""),
  expertise: text("expertise"),
  experienceYears: integer("experience_years"),
  consultationPrice: integer("consultation_price"),
  availableTime: text("available_time"),
  rating: real("rating").notNull().default(5),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ rating: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
