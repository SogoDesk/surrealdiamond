import x from "./programs.module.css";

/** The small arrow for links that open another site in a new tab. */
export default function ExtIcon() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className={x.ext}>
      <path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9" />
    </svg>
  );
}
