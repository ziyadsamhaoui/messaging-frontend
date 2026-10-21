import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("exposes the switch role and its state", () => {
    render(<Switch label="Mute messages" checked onChange={() => {}} />);
    const control = screen.getByRole("switch", { name: "Mute messages" });
    expect(control).toHaveAttribute("aria-checked", "true");
  });

  it("reports the off state", () => {
    render(<Switch label="Mute messages" checked={false} onChange={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("toggles with a click and with Space", async () => {
    const onChange = vi.fn();
    render(<Switch label="Mute messages" checked={false} onChange={onChange} />);
    const control = screen.getByRole("switch");

    await userEvent.click(control);
    expect(onChange).toHaveBeenCalledWith(true);

    control.focus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("cannot be toggled while the value is being saved", async () => {
    const onChange = vi.fn();
    render(<Switch label="Mute messages" checked={false} onChange={onChange} busy />);
    const control = screen.getByRole("switch");
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute("aria-busy", "true");
    await userEvent.click(control);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps its own surface's focus and fill treatment", () => {
    const { rerender } = render(<Switch label="a" checked onChange={() => {}} surface="pane" />);
    expect(screen.getByRole("switch").className).toContain("focus-ring-light");

    rerender(<Switch label="a" checked onChange={() => {}} surface="panel" />);
    expect(screen.getByRole("switch").className).toContain("focus-ring");
  });
});
