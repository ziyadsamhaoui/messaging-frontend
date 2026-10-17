import { describe, expect, it } from "vitest";
import { ApiError, classifyError, errorMessage, normalizeError } from "./errors";

/*
 * The error vocabulary is what every panel and the composer branch on, so a change
 * that quietly reclassifies a code changes behaviour in the chat rather than here.
 * These cases pin the codes the app actually receives.
 */
describe("classifyError", () => {
  it("classifies a blocked relationship by code, not by status", () => {
    expect(classifyError(400, "BLOCKED_RELATIONSHIP")).toBe("blocked");
  });

  it("classifies rate limiting by code and by status", () => {
    expect(classifyError(429, "SOMETHING_ELSE")).toBe("rate-limit");
    expect(classifyError(400, "RATE_LIMITED")).toBe("rate-limit");
  });

  it("does not mistake a muted participant for a block", () => {
    // PARTIAL: PARTICIPANT_MUTED shares 403 with FORBIDDEN, so it resolves to
    // "forbidden" — the composer's blocked banner must key off `isBlocked`, not 403.
    expect(classifyError(403, "PARTICIPANT_MUTED")).toBe("forbidden");
  });

  it("classifies invitation expiry and service unavailability", () => {
    expect(classifyError(410, "INVITATION_EXPIRED")).toBe("invitation-expired");
    expect(classifyError(503, "ANY")).toBe("unavailable");
  });

  it("falls back to generic for an unrecognised code", () => {
    expect(classifyError(500, "TEAPOT_IS_A_LIE")).toBe("generic");
  });
});

describe("normalizeError", () => {
  it("keeps field errors so a form can map them onto inputs", () => {
    const error = normalizeError(409, {
      message: "Username already taken",
      fieldErrors: { username: "must be unique" },
    });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe("generic");
    expect(error.fieldErrors).toEqual({ username: "must be unique" });
  });

  it("derives a code from the status when the body carries none", () => {
    expect(normalizeError(404, null).code).toBe("HTTP_404");
  });
});

describe("errorMessage", () => {
  it("replaces a bare server message with a usable one for known kinds", () => {
    const blocked = new ApiError({
      status: 400,
      code: "USER_BLOCKED",
      message: "raw",
      kind: "blocked",
    });
    expect(errorMessage(blocked)).toContain("blocked");
  });

  it("passes an unknown message through unchanged", () => {
    expect(errorMessage(normalizeError(500, { message: "Disk on fire" }))).toBe("Disk on fire");
  });
});
