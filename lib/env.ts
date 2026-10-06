function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export const API_GATEWAY_URL = withoutTrailingSlash(
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8080"
);

export const STOMP_URL = withoutTrailingSlash(
  process.env.NEXT_PUBLIC_WS_URL || `${API_GATEWAY_URL}/ws`
);

export const ACCESS_TOKEN_QUERY_PARAM = "access_token";
