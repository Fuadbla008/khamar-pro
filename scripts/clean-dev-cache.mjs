// Recovery helper for Windows EPERM errors in the dev-only build directory.
// Next.js owns .next-dev and regenerates it on startup, so removing it is safe.
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await rm(path.join(root, ".next-dev"), { recursive: true, force: true });
console.log("Cleared .next-dev");
