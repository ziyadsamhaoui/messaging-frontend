import { CursorPage } from "./types";

export function flattenPages<T>(pages: CursorPage<T>[] | undefined): T[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.items);
}
