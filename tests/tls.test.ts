import { describe, expect, it } from "vitest";
import https from "node:https";
import type { AddressInfo } from "node:net";
import selfsigned from "selfsigned";
import { runCheck } from "@/lib/checks";

describe("secure connection step", () => {
  it("fails on a self-signed certificate", async () => {
    // A throwaway certificate made just for this test.
    const pems = await selfsigned.generate([{ name: "commonName", value: "localhost" }], { keyType: "ec" });
    const server = https.createServer({ key: pems.private, cert: pems.cert }, (_req, res) => res.end("{}"));
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const { port } = server.address() as AddressInfo;
    try {
      const r = await runCheck(`https://127.0.0.1:${port}/mcp`, { allowPrivateAddresses: true });
      const connect = r.steps.find((s) => s.id === "connect")!;
      expect(connect.status).toBe("fail");
      expect(connect.code).toBe("TLS_SELF_SIGNED");
      expect(r.steps.find((s) => s.id === "handshake")?.status).toBe("skip");
    } finally {
      server.closeAllConnections();
      server.close();
    }
  });
});
