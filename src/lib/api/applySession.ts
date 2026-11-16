/**
 * After any sign in through the API (login, a setup link, a password change):
 * makes both of the screens' session copies match the person the server now
 * knows, and drops whatever an earlier person in this browser left there.
 * Without it, a staff member signing in from the setup page would see the
 * console as whoever used this browser before, until the next full page load.
 */

import { clearDealer, signIn } from "@/lib/dealer";
import { setStaffSession } from "@/lib/staff";
import { toDealerSession, toStaffSession, type Me } from "./auth";

export function applySession(me: Me) {
  const dealer = toDealerSession(me);
  if (dealer) signIn(dealer);
  else clearDealer();
  setStaffSession(toStaffSession(me));
  return dealer;
}
