import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// ---------- Users (each row = a Telegram account logged into UnlimTD) ----------
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  phone: text("phone"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username"),
  photoDataUrl: text("photo_data_url"),
  sessionEncrypted: text("session_encrypted").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  loginCount: integer("login_count").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

// ---------- Linked telegram accounts (backup / failover accounts) ----------
export const linkedAccounts = pgTable("linked_accounts", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  telegramId: text("telegram_id").notNull(),
  phone: text("phone"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username"),
  sessionEncrypted: text("session_encrypted").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Folders ----------
export const folders = pgTable("folders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  parentId: text("parent_id"),
  name: text("name").notNull(),
  isHidden: boolean("is_hidden").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- Files ----------
export const files = pgTable("files", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  folderId: text("folder_id"),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull().default("application/octet-stream"),
  size: bigint("size", { mode: "number" }).notNull().default(0),
  category: text("category").notNull().default("other"), // photo | video | audio | document | other
  telegramChatId: text("telegram_chat_id").notNull().default("me"),
  telegramMessageId: integer("telegram_message_id").notNull(),
  width: integer("width"),
  height: integer("height"),
  duration: integer("duration"),
  uploadedByGuest: boolean("uploaded_by_guest").notNull().default(false),
  guestLabel: text("guest_label"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Share links (files or notes) ----------
export const shareLinks = pgTable("share_links", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  type: text("type").notNull(), // 'file' | 'note'
  fileId: text("file_id"),
  noteId: text("note_id"),
  createdBy: text("created_by").notNull(),
  label: text("label"),
  expiresAt: timestamp("expires_at"),
  revoked: boolean("revoked").notNull().default(false),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Guest upload links ----------
export const guestLinks = pgTable("guest_links", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  ownerUserId: text("owner_user_id").notNull(),
  folderId: text("folder_id"),
  label: text("label"),
  expiresAt: timestamp("expires_at"),
  revoked: boolean("revoked").notNull().default(false),
  uploadsCount: integer("uploads_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Notes ----------
export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull().default("Untitled note"),
  content: text("content").notNull().default(""),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- Pending logins (phone / qr flow before session is authorized) ----------
export const pendingLogins = pgTable("pending_logins", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(), // 'phone' | 'qr'
  phone: text("phone"),
  phoneCodeHash: text("phone_code_hash"),
  sessionString: text("session_string").notNull(),
  status: text("status").notNull().default("pending"), // pending | password_needed | done | expired
  resultUserId: text("result_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// ---------- Activity logs ----------
export const activityLogs = pgTable("activity_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  meta: jsonb("meta"),
  ip: text("ip"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Banners (admin managed, fullscreen / bar) ----------
export const banners = pgTable("banners", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default(""),
  type: text("type").notNull().default("text"), // text | image | html | video
  content: text("content").notNull().default(""), // url or html/text content
  style: text("style").notNull().default("bar"), // bar | fullscreen
  isActive: boolean("is_active").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- Site settings (singleton) ----------
export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey(),
  siteName: text("site_name").notNull().default("UnlimTD"),
  upiId: text("upi_id").default(""),
  upiName: text("upi_name").default("UnlimTD"),
  channelLink: text("channel_link").default(""),
  developerName: text("developer_name").notNull().default("KaifSalmani"),
  developerInsta: text("developer_insta").notNull().default("@oyeeee_kaif"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
