"use client";

/**
 * A password field with an eye button at its right edge that shows or hides
 * what is typed. Every password field on the site uses it: dealer log in and
 * set up, the dashboard's change password, and the console's sign in, change
 * password and two factor. Each field toggles on its own and starts hidden.
 * Pass shown and onShownChange to control it from outside (the preview's
 * test logins show the password they fill in).
 */

import { useState, type InputHTMLAttributes } from "react";
import s from "./PasswordInput.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  shown?: boolean;
  onShownChange?: (shown: boolean) => void;
};

export default function PasswordInput({ className, shown: controlled, onShownChange, ...input }: Props) {
  const [own, setOwn] = useState(false);
  const shown = controlled ?? own;
  const toggle = () => {
    const next = !shown;
    if (controlled === undefined) setOwn(next);
    onShownChange?.(next);
  };
  return (
    <span className={s.wrap}>
      <input {...input} type={shown ? "text" : "password"} className={className ? `${className} ${s.input}` : s.input} autoCapitalize="off" spellCheck={false} />
      <button type="button" className={s.eye} onClick={toggle} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown} title={shown ? "Hide password" : "Show password"}>
        {shown ? (
          <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18" />
            <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c5.5 0 9 5.5 9.6 7-.3.7-1.2 2.3-2.7 3.8M6.2 6.3C4 7.8 2.7 10.1 2.4 12c.6 1.5 4.1 7 9.6 7 1.8 0 3.4-.6 4.7-1.4" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        ) : (
          <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.4 12C3 10.5 6.5 5 12 5s9 5.5 9.6 7c-.6 1.5-4.1 7-9.6 7s-9-5.5-9.6-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}
