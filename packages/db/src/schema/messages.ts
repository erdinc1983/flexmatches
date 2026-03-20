import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id").notNull(),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
