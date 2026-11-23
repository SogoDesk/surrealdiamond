"use client";

/**
 * Account settings (F-E2): the dealer's details as Surreal holds them, the
 * people on the store's account, and a password change. Details come from
 * the customer record (imported in the console, Dealers); changes to them go
 * through Surreal so RightClick stays the record. The demo dealer has no
 * password to change.
 *
 * Forgot your password? (client task list, November 2026, item 20) asks the
 * API to email a reset link to the dealer's own address. Until a mail service
 * is set up the API answers that it could not send, and this says so; in the
 * preview there is no email at all, so it says the same.
 */

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signOut, useDealer } from "@/lib/dealer";
import { checkPassword, setPassword, verifyPassword } from "@/lib/auth";
import { useCustomers, type Customer } from "@/lib/customers";
import { authApi, type AccountView } from "@/lib/api/auth";
import { API_AUTH, ApiRequestError } from "@/lib/api/client";
import { brand } from "@/content/site";
import PasswordRules from "@/components/account/PasswordRules";
import p from "./pages.module.css";
import s from "./account.module.css";
import PasswordInput from "@/components/ui/PasswordInput";

const ROLE_LINE: Record<Customer["role"], string> = {
  owner: "Account owner: orders, memo, invoices, payments and payment methods.",
  associate: "Associate: orders and memo. Invoices and payments stay with the account owner.",
};
const STATUS: Record<Customer["status"], string> = { active: "Active", invited: "Setup link sent", "not-invited": "Not invited yet" };

/** The API's people, in the shape these panels already show. */
function peopleFrom(view: AccountView): Customer[] {
  const address = view.store.addresses[0];
  return view.people
    .filter((person) => person.status !== "disabled")
    .map((person) => ({
      id: person.id,
      account: view.store.account ?? "",
      company: view.store.name,
      contact: person.name,
      email: person.email,
      phone: person.phone ?? "",
      city: address?.city ?? "",
      state: address?.state ?? "",
      role: person.role,
      status: person.status === "active" ? "active" : person.status === "invited" ? "invited" : "not-invited",
      source: "import",
      importedAt: "",
    }));
}

const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

/** Forgot your password? A reset link to the dealer's own email, or a clear error when it could not be sent. */
function ForgotPassword({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");
  const [error, setError] = useState<ReactNode>(null);

  const couldNotSend = (
    <>
      We could not send the reset email right now. Please try again later, or call us at <a href={brand.office.phoneHref}>{brand.office.phone}</a>.
    </>
  );

  const request = async () => {
    setBusy(true);
    setSent("");
    setError(null);
    try {
      if (!API_AUTH) {
        // The preview sends no email.
        await new Promise((resolve) => setTimeout(resolve, 600));
        throw new Error("No email in the preview.");
      }
      await authApi.resetLink();
      setSent(`We sent a link to set a new password to ${email}. It works for one hour.`);
    } catch (failure) {
      setError(failure instanceof ApiRequestError && failure.status === 429 ? "Too many requests. Please wait a minute and try again." : couldNotSend);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${s.wideField} ${s.forgot}`}>
      <button type="button" className={s.forgotLink} onClick={request} disabled={busy} aria-busy={busy}>
        {busy ? "Sending a reset link" : "Forgot your password?"}
      </button>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {sent && (
        <p className={p.notice} role="status">
          {sent}
        </p>
      )}
    </div>
  );
}

function ChangePassword({ c }: { c: Customer }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    if (!current) return setError("Enter your current password.");
    if (!checkPassword(next, { email: c.email, company: c.company }).valid) return setError("The new password does not meet every rule yet.");
    if (next !== confirm) return setError("The two new passwords do not match.");
    if (next === current) return setError("Choose a password different from the current one.");
    setBusy(true);
    if (API_AUTH) {
      try {
        await authApi.changePassword(current, next);
      } catch (failure) {
        setBusy(false);
        const fields = failure instanceof ApiRequestError ? failure.fields : undefined;
        return setError(fields?.current ?? fields?.next ?? (failure instanceof ApiRequestError ? failure.message : "We could not reach the server. Please try again."));
      }
      setBusy(false);
      setError("");
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
      return;
    }
    const result = await verifyPassword(c.email, current);
    if (!result.ok) {
      setBusy(false);
      if (result.reason === "locked") return setError(`Too many wrong passwords. Try again in ${result.minutes} minutes.`);
      return setError(`Your current password does not match.${result.left ? ` ${result.left} ${result.left === 1 ? "try" : "tries"} left.` : ""}`);
    }
    await setPassword(c.email, next);
    setBusy(false);
    setError("");
    setCurrent("");
    setNext("");
    setConfirm("");
    setDone(true);
  };

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <label className={`${s.field} ${s.wideField}`}>
        <span>Current password</span>
        <PasswordInput autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <ForgotPassword email={c.email} />
      <label className={s.field}>
        <span>New password</span>
        <PasswordInput autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="change-rules" />
      </label>
      <label className={s.field}>
        <span>Confirm new password</span>
        <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      <div id="change-rules" className={s.wideField}>
        <PasswordRules password={next} email={c.email} company={c.company} />
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className={p.notice} role="status">
          Password changed. Use the new one next time you log in.
        </p>
      )}
      <button type="submit" className={p.primary} disabled={busy}>
        {busy ? "Saving" : "Change password"}
      </button>
    </form>
  );
}

export default function AccountSettings() {
  const router = useRouter();
  const dealer = useDealer();
  const stored = useCustomers();
  const [view, setView] = useState<AccountView | null>(null);

  useEffect(() => {
    if (!API_AUTH) return;
    let live = true;
    authApi
      .account()
      .then((found) => {
        if (live) setView(found);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  if (!dealer) return null;

  const customers = API_AUTH ? (view ? peopleFrom(view) : []) : stored;
  const c = customers.find((x) => x.email.toLowerCase() === dealer.email.toLowerCase());
  const team = c ? customers.filter((x) => x.account === c.account) : [];
  const role = dealer.role ?? "owner";

  return (
    <div className={p.page}>
      <nav aria-label="Breadcrumb" className={p.crumbs}>
        <Link href="/dashboard">Dashboard</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">Account settings</span>
      </nav>
      <header className={p.head}>
        <div>
          <p className={p.kicker}>Your account</p>
          <h1 className={p.title}>Account settings</h1>
          <p className={p.lead}>Your details as Surreal holds them, the people on your store&apos;s account, and your password.</p>
        </div>
      </header>
      {dealer.demo && <p className={p.sampleNote}>You are exploring as the demo dealer, which has no password. Log in with one of the test accounts to try a password change.</p>}

      <div className={s.columns}>
        <section className={p.panel} aria-labelledby="acct-details">
          <div className={p.panelHead}>
            <h2 id="acct-details" className={p.panelTitle}>
              Your details
            </h2>
            {c && <span className={p.status}>{STATUS[c.status]}</span>}
          </div>
          <dl className={s.details}>
            <div>
              <dt>Store</dt>
              <dd>{dealer.store}</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>{dealer.account ?? (dealer.demo ? "DEMO" : "Not linked yet")}</dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>{dealer.contact}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{dealer.email}</dd>
            </div>
            {c && (
              <>
                <div>
                  <dt>Phone</dt>
                  <dd>{c.phone || "Not on file"}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{[c.city, c.state].filter(Boolean).join(", ") || "Not on file"}</dd>
                </div>
              </>
            )}
            <div className={s.wideField}>
              <dt>Role</dt>
              <dd>{ROLE_LINE[role]}</dd>
            </div>
            {c?.activatedAt && (
              <div className={s.wideField}>
                <dt>On the new site since</dt>
                <dd>{date(c.activatedAt)}</dd>
              </div>
            )}
          </dl>
          <p className={s.detailsNote}>
            Something out of date? <Link href="/contact?type=account" className={p.textLink}>Tell us</Link> and we will update it in our records, so your invoices and statements match.
          </p>
        </section>

        <section className={p.panel} aria-labelledby="acct-password">
          <h2 id="acct-password" className={p.panelTitle}>
            Password
          </h2>
          {c && !dealer.demo ? (
            <ChangePassword c={c} />
          ) : (
            <p className={s.empty}>{API_AUTH && !view ? "Loading your account." : dealer.demo ? "The demo dealer signs in without a password." : "This account signs in through Surreal. Ask us to link it to your email."}</p>
          )}
          <div className={s.otherDoors}>
            <button
              type="button"
              className={p.textBtn}
              onClick={() => {
                signOut();
                router.push("/login");
              }}
            >
              Log out of this browser
            </button>
          </div>
        </section>
      </div>

      {team.length > 0 && (
        <section className={p.panel} aria-labelledby="acct-team">
          <div className={p.panelHead}>
            <h2 id="acct-team" className={p.panelTitle}>
              People on this account
            </h2>
            <span className={p.count}>{team.length}</span>
          </div>
          <ul className={s.team}>
            {team.map((m) => (
              <li key={m.id}>
                <span className={s.methodText}>
                  <span className={s.methodName}>
                    {m.contact}
                    {m.id === c?.id ? " (you)" : ""}
                  </span>
                  <span className={s.methodMeta}>{m.email}</span>
                </span>
                <span className={s.methodMeta}>{m.role === "owner" ? "Account owner" : "Associate"}</span>
                <span className={p.status}>{STATUS[m.status]}</span>
              </li>
            ))}
          </ul>
          <p className={s.detailsNote}>To add or remove someone, {role === "owner" ? "" : "ask your account owner to "}contact Surreal. Each person gets their own login.</p>
        </section>
      )}
    </div>
  );
}
