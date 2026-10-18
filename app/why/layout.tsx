import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why BadrLink",
  description:
    "BadrLink is for talking with people you already know, one on one or in groups. Connection requests, direct chats and groups, and no feed.",
  alternates: {
    canonical: "/",
  },
};

export default function WhyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
