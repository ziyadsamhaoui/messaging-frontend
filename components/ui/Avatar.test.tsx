import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Avatar, initialsFor } from "./Avatar";

describe("initialsFor", () => {
  it("uses the first letter plus the trailing digit when a name ends in one", () => {
    expect(initialsFor("admin2")).toBe("A2");
    expect(initialsFor("admin3")).toBe("A3");
  });

  it("uses the second letter when there is no trailing digit", () => {
    expect(initialsFor("admin")).toBe("AD");
  });

  it("keeps first-plus-last for a multi-word name", () => {
    expect(initialsFor("Emma Stone")).toBe("ES");
    expect(initialsFor("  ziyad   samhaoui  ")).toBe("ZS");
  });

  it("handles a one-character name and an empty name", () => {
    expect(initialsFor("a")).toBe("A");
    expect(initialsFor("   ")).toBe("?");
  });
});

describe("Avatar", () => {
  it("renders the username initials when there is no picture", () => {
    render(<Avatar name="admin2" seed="u-2" />);
    expect(screen.getByText("A2")).toBeInTheDocument();
  });

  it("keeps the initials until the picture has loaded, so a broken URL never leaves a blank circle", () => {
    const { container } = render(
      <Avatar name="admin2" seed="u-2" src="https://example.com/a.png" />
    );
    expect(screen.getByText("A2")).toBeInTheDocument();
    expect(container.querySelector("[style*='background-image']")).toBeNull();
  });

  it("shows the picture over the initials once it has loaded", async () => {
    class LoadingImage {
      onload: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", LoadingImage);
    try {
      const { container } = render(
        <Avatar name="admin2" seed="u-2" src="https://example.com/a.png" />
      );
      await waitFor(() =>
        expect(container.querySelector("[style*='background-image']")).not.toBeNull()
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("ignores a non-http source rather than injecting it into a CSS url()", () => {
    render(<Avatar name="admin" seed="u-1" src="javascript:alert(1)" />);
    expect(screen.getByText("AD")).toBeInTheDocument();
  });

  it("names the presence state in text, not by colour alone", () => {
    render(<Avatar name="admin" seed="u-1" status="ONLINE" />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });
});
