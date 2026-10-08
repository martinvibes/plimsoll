"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import * as ops from "@/lib/plimsoll/operations";
import { personaByKey, type Role } from "@/lib/plimsoll/personas";
import { PERSONA_COOKIE, session } from "@/lib/plimsoll/session";
import type { Share } from "@/lib/plimsoll/types";

export type Result = { ok?: string; error?: string };

export async function choosePersona(key: string) {
  (await cookies()).set(PERSONA_COOKIE, personaByKey(key).key, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
}

/** Run one ledger step as the current persona, if it has `role`. */
async function act(role: Role, done: string, step: (party: string) => Promise<void>): Promise<Result> {
  try {
    const { persona, party } = await session();
    if (persona.role !== role) return { error: `Switch to a ${role} to do this.` };
    await step(party);
    revalidatePath("/", "layout");
    return { ok: done };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function contribute(roundCid: string, parcels: Share[][]): Promise<Result> {
  return act("fund", "Sent. Each node now holds two of your three shares.", (fund) =>
    ops.contribute(fund, roundCid, parcels),
  );
}

export async function report(roundCid: string, _prev: Result, _form: FormData): Promise<Result> {
  return act("node", "Reported. Your column sums are on the ledger.", (node) => ops.report(node, roundCid));
}

export async function publish(roundCid: string, _prev: Result, _form: FormData): Promise<Result> {
  return act("node", "Published and listed to readers.", (node) => ops.publish(node, roundCid));
}

export async function decide(applicationCid: string, approve: boolean, _prev: Result, _form: FormData): Promise<Result> {
  return act("node", approve ? "Approved." : "Turned away.", (node) => ops.decide(node, applicationCid, approve));
}

export async function buy(listingCid: string, _prev: Result, _form: FormData): Promise<Result> {
  return act("reader", "Paid every node. The mark is yours.", (reader) => ops.buy(reader, listingCid));
}

export async function openRound(_prev: Result, form: FormData): Promise<Result> {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const minutes = Number(text("minutes") || "10");
  const loan = { id: text("id").toUpperCase(), borrower: text("borrower"), facility: text("facility"), maturity: text("maturity") };
  if (!loan.id || !loan.borrower || !loan.facility || !loan.maturity) return { error: "Fill in every field." };
  if (!(minutes >= 1 && minutes <= 10_080)) return { error: "A round stays open between 1 minute and 7 days." };
  return act("node", `Round open for ${minutes} min. Every fund has three invitations.`, (node) =>
    ops.openRound(node, loan, text("asOf") || new Date().toISOString().slice(0, 10), minutes),
  );
}
