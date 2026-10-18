import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageInput } from "./MessageInput";
import { ToastProvider } from "@/components/ui/Toast";

const recorder = vi.hoisted(() => ({
  state: "idle",
  seconds: 0,
  analyser: null,
  error: null,
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
  cancel: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("@/hooks/useVoiceRecorder", () => ({
  useVoiceRecorder: () => recorder,
}));

function renderComposer(overrides: Partial<React.ComponentProps<typeof MessageInput>> = {}) {
  const props: React.ComponentProps<typeof MessageInput> = {
    value: "",
    onChange: vi.fn(),
    onSend: vi.fn(),
    onSendAttachment: vi.fn(),
    ...overrides,
  };
  return render(
    <ToastProvider>
      <MessageInput {...props} />
    </ToastProvider>
  );
}

beforeEach(() => {
  recorder.state = "idle";
  recorder.start.mockClear();
});

describe("MessageInput", () => {
  it("offers the microphone and the attachment control when the field is empty", async () => {
    renderComposer();

    expect(screen.queryByRole("button", { name: "Send message" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add attachment" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Record a voice message" }));
    expect(recorder.start).toHaveBeenCalledTimes(1);
  });

  it("offers send, not the microphone, once there is text", () => {
    renderComposer({ value: "hello" });

    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record a voice message" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add attachment" })).toBeInTheDocument();
  });

  it("sends the trimmed text from the send control", async () => {
    const onSend = vi.fn();
    renderComposer({ value: "  hello  ", onSend });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("sends on Enter and keeps Shift+Enter for a newline", async () => {
    const onSend = vi.fn();
    renderComposer({ value: "hello", onSend });

    const user = userEvent.setup();
    const field = screen.getByLabelText("Message");
    field.focus();

    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onSend).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("opens the grouped upload menu from the attachment control", async () => {
    renderComposer();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add attachment" }));

    const menu = await screen.findByRole("menu", { name: "Add an attachment" });
    expect(menu).toHaveTextContent("Photos and videos");
    expect(menu).toHaveTextContent("Documents and files");
    expect(menu).toHaveTextContent("Audio files");
  });
});
