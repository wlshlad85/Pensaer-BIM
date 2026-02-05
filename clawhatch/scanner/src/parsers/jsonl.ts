/**
 * Parser for JSONL session log files.
 * Caps reading at 1MB or 1000 lines to prevent scanner hanging on large files.
 */

import { readFile, stat } from "node:fs/promises";
import type { SessionEntry } from "../types.js";

const MAX_BYTES = 1_048_576; // 1MB
const MAX_LINES = 1000;

export interface JsonlParseResult {
  entries: SessionEntry[];
  truncated: boolean;
  totalSizeBytes: number;
}

export async function parseJsonl(
  filePath: string,
  deep: boolean = false
): Promise<JsonlParseResult> {
  const fileStat = await stat(filePath);
  const totalSizeBytes = fileStat.size;

  const limit = deep ? Infinity : MAX_BYTES;

  let raw: string;
  if (!deep && totalSizeBytes > MAX_BYTES) {
    // Read only the first 1MB
    const { createReadStream } = await import("node:fs");
    raw = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let bytesRead = 0;
      const stream = createReadStream(filePath, {
        encoding: "utf-8",
        highWaterMark: 64 * 1024,
      });
      stream.on("data", (chunk: string | Buffer) => {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytesRead += buf.length;
        chunks.push(buf);
        if (bytesRead >= MAX_BYTES) {
          stream.destroy();
        }
      });
      stream.on("close", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      stream.on("error", reject);
    });
  } else {
    raw = await readFile(filePath, "utf-8");
  }

  const lines = raw.split("\n");
  const maxLines = deep ? lines.length : MAX_LINES;
  const entries: SessionEntry[] = [];
  const truncated = !deep && (totalSizeBytes > MAX_BYTES || lines.length > MAX_LINES);

  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      entries.push(JSON.parse(line) as SessionEntry);
    } catch {
      // Skip malformed lines
    }
  }

  return { entries, truncated, totalSizeBytes };
}
