/**
 * Run a check from the terminal:  npx tsx scripts/check.ts https://mcp.example.com/mcp
 */
import { runCheck } from "../lib/checks";

const url = process.argv[2];
if (!url) {
  console.error("Usage: npx tsx scripts/check.ts <url>");
  process.exit(1);
}
runCheck(url).then((r) => {
  const icon = { pass: "✓", warn: "!", fail: "✗", skip: "–" } as const;
  console.log(`\n${r.url}\n${r.summary} (${r.verdict}, ${r.totalMs} ms)\n`);
  for (const s of r.steps) {
    console.log(`${icon[s.status]} ${s.name.padEnd(28)} ${s.meta}`);
    console.log(`    ${s.message}${s.hint ? `\n    Fix: ${s.hint}` : ""}`);
  }
  if (r.protocol) console.log(`\nProtocol: ${r.protocol.era} ${r.protocol.version ?? ""}`);
});
