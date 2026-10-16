import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `/app` is the entry point of the authenticated app and conversations is the
   * default destination. Doing this in the router config makes it a real 307
   * before any HTML is served; a redirect from a page alone would still be a
   * prerendered document that redirects after hydration.
   */
  async redirects() {
    return [{ source: "/app", destination: "/app/chats", permanent: false }];
  },
};

export default nextConfig;
