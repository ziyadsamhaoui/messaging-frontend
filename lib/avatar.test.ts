import { describe, expect, it } from "vitest";
import {
  AVATAR_MAX_ZOOM,
  AVATAR_MIN_ZOOM,
  AVATAR_VIEW_PX,
  DEFAULT_AVATAR_CROP,
  clampAvatarCrop,
} from "./avatar";

describe("clampAvatarCrop", () => {
  it("keeps zoom within the allowed range", () => {
    expect(clampAvatarCrop({ ...DEFAULT_AVATAR_CROP, zoom: 0.2 }, 800, 600).zoom).toBe(AVATAR_MIN_ZOOM);
    expect(clampAvatarCrop({ ...DEFAULT_AVATAR_CROP, zoom: 9 }, 800, 600).zoom).toBe(AVATAR_MAX_ZOOM);
  });

  it("does not allow panning past the picture edge", () => {
    const width = 800;
    const height = 600;
    const scale = AVATAR_VIEW_PX / height;
    const maxX = (width * scale - AVATAR_VIEW_PX) / 2;
    const clamped = clampAvatarCrop({ ...DEFAULT_AVATAR_CROP, offsetX: 10_000, offsetY: -10_000 }, width, height);
    expect(clamped.offsetX).toBeCloseTo(maxX);
    expect(clamped.offsetY).toBeCloseTo(0);
  });

  it("uses the rotated dimensions when a quarter turn swaps width and height", () => {
    const width = 800;
    const height = 600;
    const scale = AVATAR_VIEW_PX / height;
    const maxX = (600 * scale - AVATAR_VIEW_PX) / 2;
    const maxY = (800 * scale - AVATAR_VIEW_PX) / 2;
    const clamped = clampAvatarCrop(
      { zoom: 1, rotation: 90, offsetX: 10_000, offsetY: 10_000 },
      width,
      height
    );
    expect(clamped.offsetX).toBeCloseTo(maxX);
    expect(clamped.offsetY).toBeCloseTo(maxY);
  });
});
