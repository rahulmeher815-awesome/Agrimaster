import { createInsertSchema } from "drizzle-zod";
import { date, integer, pgTable, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { problemsTable } from "./problems";

export const bookingsTable = pgTable("agriconnect_bookings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  farmerId: text("farmer_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expertId: text("expert_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id").references(() => problemsTable.id, {
    onDelete: "set null",
  }),
  scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  price: integer("price").notNull(),
  status: text("status").notNull().default("confirmed"),
});

export const insertBookingSchema = createInsertSchema(bookingsTable);
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
