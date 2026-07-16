import { NextRequest, NextResponse } from "next/server";
import { loadShare } from "@/lib/share";
import { openMediaStream } from "@/lib/media";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const result = await loadShare(token);
    if ("error" in result || result.kind !== "file") {
      return NextResponse.json({ error: "error" in result ? result.error : "Invalid link" }, { status: 404 });
    }

    const range = req.headers.get("range");
    const opened = await openMediaStream(result.owner.sessionEncrypted, result.file.telegramMessageId, range);
    const download = req.nextUrl.searchParams.get("download") === "1";

    const headers = new Headers();
    headers.set("Content-Type", result.file.mimeType || "application/octet-stream");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Length", String(opened.end - opened.start + 1));
    headers.set("Cache-Control", "private, max-age=3600");
    if (opened.status === 206) {
      headers.set("Content-Range", `bytes ${opened.start}-${opened.end}/${opened.totalSize}`);
    }
    headers.set(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(result.file.name)}`
    );
    return new Response(opened.stream, { status: opened.status, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to stream file";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
