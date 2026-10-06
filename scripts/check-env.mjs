const optional = ["NEXT_PUBLIC_API_GATEWAY_URL", "NEXT_PUBLIC_WS_URL"];

const invalid = optional.filter(
  (key) => process.env[key] && !/^https?:\/\//.test(process.env[key])
);

if (invalid.length) {
  console.error("These env vars must be absolute http(s) URLs when set:");
  for (const key of invalid) {
    console.error(`- ${key}=${process.env[key]}`);
  }
  process.exit(1);
}

console.log("Env looks good (API gateway default: http://localhost:8080).");
