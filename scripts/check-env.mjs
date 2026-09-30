const required = ["NEXT_PUBLIC_API_BASE_URL", "NEXT_PUBLIC_WS_URL"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error("Missing required env vars:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

console.log("Env looks good.");

