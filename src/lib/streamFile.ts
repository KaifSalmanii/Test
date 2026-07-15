import "server-only";
import { downloadTelegramRange, type TelegramAccountRow } from "@/lib/telegram";

export async function streamTelegramFile(
  req: Request,
  account: TelegramAccountRow,
  file: { messageId: number; size: number; mimeType: string; name: string }
) {
  const url = new URL(req.url);
  const forceDownload = url.searchParams.get("download") === "1";
  const total = Number(file.size) || 0;
  const range = req.headers.get("range");

  const baseHeaders: Record<string, string> = {
    "Content-Type": file.mimeType || "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(
      file.name
    )}"`,
  };

  try {
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      const start = match && match[1] ? parseInt(match[1], 10) : 0;
      const end = match && match[2] ? parseInt(match[2], 10) : total - 1;

      const {
        buffer,
        start: s,
        end: e,
        total: t,
      } = await downloadTelegramRange(account, file.messageId, total, start, end);

      return new Response(new Uint8Array(buffer), {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${s}-${e}/${t}`,
          "Content-Length": String(buffer.length),
        },
      });
    }

    const { buffer } = await downloadTelegramRange(account, file.messageId, total, 0, total - 1);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: { ...baseHeaders, "Content-Length": String(buffer.length) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load file from Telegram.";
    return new Response(message, { status: 502 });
  }
}
