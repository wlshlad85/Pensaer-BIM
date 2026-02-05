/**
 * Parser for .env files.
 */

import { readFile } from "node:fs/promises";
import type { EnvVars } from "../types.js";

export async function parseEnv(envPath: string): Promise<EnvVars | null> {
  try {
    const raw = await readFile(envPath, "utf-8");
    const vars: EnvVars = {};

    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;

      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();

      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      vars[key] = value;
    }

    return vars;
  } catch {
    return null;
  }
}
