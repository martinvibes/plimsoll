"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "./Toaster";
import type { Result } from "@/app/actions";

type Props = {
  action: (prev: Result, form: FormData) => Promise<Result>;
  label: string;
  pendingLabel?: string;
  tone?: "primary" | "secondary" | "signal";
  icon?: React.ReactNode;
  children?: React.ReactNode;
};

/** A single ledger step behind one button, with its outcome shown in place. */
export default function ActionForm({ action, label, pendingLabel, tone = "primary", icon, children }: Props) {
  const [result, run, pending] = useActionState(action, {});
  useEffect(() => toast(result), [result]);
  return (
    <form action={run}>
      {children}
      <button className={`button compact ${tone === "primary" ? "" : tone}`} disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle size={16} className="spin" aria-hidden="true" />
            {pendingLabel ?? "Submitting…"}
          </>
        ) : (
          <>
            {label}
            {icon}
          </>
        )}
      </button>
      {result.ok && !pending && (
        <p className="result" data-ok role="status">
          {result.ok}
        </p>
      )}
      {result.error && !pending && (
        <p className="result" data-error role="alert">
          {result.error}
        </p>
      )}
    </form>
  );
}
