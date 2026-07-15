export type FileCategory = "image" | "video" | "audio" | "document" | "other";

export function categoryFromMime(mime: string, name?: string): FileCategory {
  const m = (mime || "").toLowerCase();
  const ext = (name?.split(".").pop() || "").toLowerCase();

  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";

  const docExt = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "txt",
    "csv",
    "rtf",
    "odt",
    "ods",
    "odp",
  ];
  const imgExt = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "avif"];
  const vidExt = ["mp4", "mkv", "mov", "avi", "webm", "m4v", "3gp"];
  const audExt = ["mp3", "wav", "ogg", "m4a", "flac", "aac", "opus"];

  if (docExt.includes(ext)) return "document";
  if (imgExt.includes(ext)) return "image";
  if (vidExt.includes(ext)) return "video";
  if (audExt.includes(ext)) return "audio";
  if (
    m === "application/pdf" ||
    m.includes("document") ||
    m.includes("text") ||
    m.includes("sheet") ||
    m.includes("presentation")
  ) {
    return "document";
  }
  return "other";
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${sizes[i]}`;
}

export function formatDate(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function formatDateTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "Untitled";
}
