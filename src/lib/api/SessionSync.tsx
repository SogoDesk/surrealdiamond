"use client";

/**
 * Keeps the screens' copy of the session true to the API: on each full page load
 * it asks who is signed in, and clears the copy when the session has ended (a
 * sign out elsewhere, a disabled account, a password change). Does nothing while
 * API_AUTH is off, so the preview's browser sessions keep working.
 */

import { useEffect } from "react";
import { clearDealer } from "@/lib/dealer";
import { clearStaff } from "@/lib/staff";
import { applySession } from "./applySession";
import { authApi } from "./auth";
import { API_AUTH, ApiRequestError } from "./client";

export default function SessionSync() {
  useEffect(() => {
    if (!API_AUTH) return;
    let live = true;
    authApi
      .me()
      .then((me) => {
        if (!live) return;
        applySession(me);
      })
      .catch((error: unknown) => {
        // Only a clear "not signed in" ends the copy: a network blip does not.
        if (live && error instanceof ApiRequestError && error.status === 401) {
          clearDealer();
          clearStaff();
        }
      });
    return () => {
      live = false;
    };
  }, []);
  return null;
}
