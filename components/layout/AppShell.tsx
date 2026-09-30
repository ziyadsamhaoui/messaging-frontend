import React from "react";
import { cn } from "../../lib/utils";

interface AppShellProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  details?: React.ReactNode;
}

export function AppShell({ sidebar, main, details }: AppShellProps) {
  return (
    <div className="flex h-full w-full">
      <aside className="hidden h-full w-80 flex-shrink-0 border-r border-[rgba(164,190,123,0.1)] bg-gradient-to-b from-[rgba(26,58,32,0.95)] to-[rgba(40,84,48,0.95)] lg:block">
        {sidebar}
      </aside>
      <main className={cn("flex h-full flex-1 flex-col", details ? "lg:w-[calc(100%-288px-320px)]" : "")}>{main}</main>
      {details && (
        <aside className="hidden h-full w-80 flex-shrink-0 border-l border-[rgba(164,190,123,0.1)] bg-gradient-to-b from-[rgba(26,58,32,0.95)] to-[rgba(40,84,48,0.95)] lg:block">
          {details}
        </aside>
      )}
    </div>
  );
}

