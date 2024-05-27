import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v4()`),
  userName: varchar("username", { length: 15 }).notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v4()`),
  message: text("message").notNull(),
  recipientId: uuid("recipient_id").references(() => users.id),
  senderId: uuid("sender_id").references(() => users.id),
  dateSent: timestamp("created_at").notNull().defaultNow(),
});
