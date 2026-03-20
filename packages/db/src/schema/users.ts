import { pgTable, uuid, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const fitnessLevelEnum = pgEnum("fitness_level", ["beginner", "intermediate", "advanced"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // Supabase auth.users id
  username: text("username").notNull().unique(),
  fullName: text("full_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  gender: genderEnum("gender"),
  age: integer("age"),
  fitnessLevel: fitnessLevelEnum("fitness_level"),
  gymName: text("gym_name"),
  city: text("city"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
