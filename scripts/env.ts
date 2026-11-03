import { loadEnvConfig } from "@next/env";
// Suppress dotenv diagnostics; never log resolved environment values.
loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} });
