export function getTelegramCreds() {
  const apiId = Number(process.env.TELEGRAM_API_ID || 0);
  const apiHash = process.env.TELEGRAM_API_HASH || "";
  return { apiId, apiHash, configured: apiId > 0 && apiHash.length > 0 };
}

export function getAuthSecret() {
  return process.env.AUTH_SECRET || "dev-insecure-secret-change-me-please-0000";
}

export function getEncryptionKey() {
  return process.env.ENCRYPTION_KEY || "dev-insecure-key-change-me-please-000000";
}

export function getAdminPhones() {
  return (process.env.ADMIN_PHONES || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function getSiteName() {
  return process.env.NEXT_PUBLIC_SITE_NAME || "UnlimTD";
}
