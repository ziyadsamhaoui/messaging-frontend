"use client";

import React from "react";
import Image from "next/image";
import { MainPane } from "./MainPane";

/**
 * The main pane with nothing open in it.
 *
 * It keeps the product's own illustration instead of an empty gradient, states
 * what is expected of the reader and offers the one action that makes sense from
 * here. Shared by the chats and connections destinations.
 */
export function SelectionPrompt({
  title,
  description,
  action,
  hideOnNarrow,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  hideOnNarrow?: boolean;
}) {
  return (
    <MainPane hideOnNarrow={hideOnNarrow}>
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <Image
          src="/texting_image_new.png"
          width={240}
          height={240}
          alt=""
          className="h-[240px] w-auto opacity-90"
          priority={false}
        />
        <h2 className="font-ui text-[20px] font-semibold text-[var(--app-pane-text)]">{title}</h2>
        <p className="max-w-[42ch] font-ui text-[15px] text-[var(--app-pane-text-soft)]">{description}</p>
        {action}
      </div>
    </MainPane>
  );
}
