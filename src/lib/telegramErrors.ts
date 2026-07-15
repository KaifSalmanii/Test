export function cleanTelegramError(message: string): string {
  if (message.includes("PHONE_NUMBER_INVALID")) return "That phone number looks invalid.";
  if (message.includes("PHONE_NUMBER_BANNED")) return "This phone number is banned on Telegram.";
  if (message.includes("PHONE_CODE_INVALID")) return "The code you entered is incorrect.";
  if (message.includes("PHONE_CODE_EXPIRED")) return "The code expired. Request a new one.";
  if (message.includes("PASSWORD_HASH_INVALID")) return "Incorrect 2FA password.";
  if (message.includes("FLOOD_WAIT")) return "Too many attempts. Please wait a bit and try again.";
  if (message.includes("LOGIN_EXPIRED")) return "This login attempt expired. Please try again.";
  if (message.includes("TELEGRAM_NOT_CONFIGURED"))
    return "Telegram API credentials are not configured on this server yet.";
  return message;
}
