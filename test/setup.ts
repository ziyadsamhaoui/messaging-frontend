import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/*
 * Testing Library's automatic cleanup only registers itself when the test globals
 * exist. This project runs with `globals: false` so that every `describe`/`it` is an
 * explicit import, which means cleanup has to be wired here instead — without it the
 * DOM of one test leaks into the next and a `getByRole` that should match one element
 * matches two.
 */
afterEach(cleanup);
