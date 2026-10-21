import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/app", destination: "/app/chats", permanent: false }];
  },
};

export default nextConfig;
