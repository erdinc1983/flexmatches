import { pgTable, uuid, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const matchStatusEnum = pgEnum("match_status", ["pending", "accepted", "declined"]);

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: uuid("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: matchStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
