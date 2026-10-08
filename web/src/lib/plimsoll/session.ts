import "server-only";
import { cookies } from "next/headers";
import { loadCast } from "@/lib/plimsoll/cast";
import { personaByKey, type Cast, type Persona } from "@/lib/plimsoll/personas";

export const PERSONA_COOKIE = "plimsoll-persona";

export type Session = { cast: Cast; persona: Persona; party: string };

/** Who the visitor is acting as, and the party behind them. */
export async function session(): Promise<Session> {
  const persona = personaByKey((await cookies()).get(PERSONA_COOKIE)?.value);
  const cast = loadCast();
  const party = persona.party(cast);
  if (!party) throw new Error(`The demo cast has no party for ${persona.name}.`);
  return { cast, persona, party };
}

export async function currentPersona(): Promise<Persona> {
  return personaByKey((await cookies()).get(PERSONA_COOKIE)?.value);
}
