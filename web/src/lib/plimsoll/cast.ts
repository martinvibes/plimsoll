import "server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Cast } from "@/lib/plimsoll/personas";

export class CastMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CastMissingError";
  }
}

/** The party ids written by the seed script: from PLIMSOLL_CAST (JSON) or a file. */
export function loadCast(): Cast {
  if (process.env.PLIMSOLL_CAST) return JSON.parse(process.env.PLIMSOLL_CAST) as Cast;
  const file = resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.PLIMSOLL_CAST_FILE ?? "../.plimsoll/cast.json");
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Cast;
  } catch {
    throw new CastMissingError(`No demo cast at ${file}. Run \`make seed\` with the sandbox up.`);
  }
}
