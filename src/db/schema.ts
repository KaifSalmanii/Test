import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// One row per Telegram account that has ever logged in.
export const telegramAccounts = pgTable("telegram_accounts", {
  id: id(),
  telegramUserId: text("telegram_user_id").notNull().unique(),
  phone: text("phone"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username"),
  sessionString: text("session_string").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Opaque app-level cookie sessions mapped to a Telegram account.
export const appSessions = pgTable("app_sessions", {
  token: text("token").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => telegramAccounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const folders = pgTable("folders", {
  id: id(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => telegramAccounts.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const files = pgTable("files", {
  id: id(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => telegramAccounts.id, { onDelete: "cascade" }),
  folderId: text("folder_id"),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull().default("application/octet-stream"),
  category: text("category").notNull().default("other"),
  size: bigint("size", { mode: "number" }).notNull().default(0),
  messageId: bigint("message_id", { mode: "number" }).notNull(),
  uploadedVia: text("uploaded_via").notNull().default("owner"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notes = pgTable("notes", {
  id: id(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => telegramAccounts.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Untitled note"),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const shareLinks = pgTable("share_links", {
  id: id(),
  token: text("token").notNull().unique(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => telegramAccounts.id, { onDelete: "cascade" }),
  resourceType: text("resource_type").notNull(), // file | folder | note
  resourceId: text("resource_id").notNull(),
  resourceName: text("resource_name").notNull().default(""),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const guestLinks = pgTable("guest_links", {
  id: id(),
  token: text("token").notNull().unique(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => telegramAccounts.id, { onDelete: "cascade" }),
  folderId: text("folder_id"),
  label: text("label").notNull().default("Guest upload"),
  expiresAt: timestamp("expires_at"),
  maxUses: integer("max_uses"),
  uses: integer("uses").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  active: boolean("active").notNull().default(true),
});
