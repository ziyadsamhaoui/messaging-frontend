/*
 * The one piece of authentication form state that must outlive a mode switch.
 *
 * `/login` and `/register` are separate routes, so switching modes is a real
 * client navigation: it swaps the page segment, unmounts the card and drops its
 * React state. The email is the only value deliberately carried across — the
 * visitor should not retype it — while passwords are never preserved.
 *
 * A module-level value (rather than sessionStorage) is intentional: it survives
 * the in-app navigation but disappears on a reload, so a stale address can never
 * be prefilled on a later visit.
 */
let draftEmail = "";

export function getDraftEmail(): string {
  return draftEmail;
}

export function setDraftEmail(value: string): void {
  draftEmail = value;
}

export function clearDraftEmail(): void {
  draftEmail = "";
}
