/**
 * A tiny fake MCP server for tests. Each "mode" pretends to be a different
 * kind of server: healthy (current or previous spec), broken in some way,
 * or behind a sign-in.
 */
import http from "node:http";
import type { AddressInfo } from "node:net";

export type MockMode =
  | "modern"
  | "legacy"
  | "dual"
  | "legacy-sse-reply"
  | "html"
  | "404"
  | "500"
  | "530"
  | "429"
  | "auth-good"
  | "auth-no-header"
  | "auth-no-metadata"
  | "sse-only"
  | "bad-schema"
  | "no-descriptions"
  | "no-tools-capability"
  | "hang"
  | "firewall";

const goodTools = [
  { name: "search", description: "Search the docs for a phrase.", inputSchema: { type: "object", properties: {} } },
  { name: "get_page", description: "Fetch one docs page by its slug.", inputSchema: { type: "object" } },
];

export interface MockServer {
  url: string;
  /** Every request the server received (method + JSON-RPC method). */
  calls: { httpMethod: string; rpcMethod?: string; headers: http.IncomingHttpHeaders }[];
  close(): Promise<void>;
}

export async function startMockServer(mode: MockMode): Promise<MockServer> {
  const calls: MockServer["calls"] = [];

  const server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let body: { id?: number; method?: string; params?: Record<string, unknown> } = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      // ignore
    }
    calls.push({ httpMethod: req.method ?? "", rpcMethod: body.method, headers: req.headers });

    const json = (status: number, payload: unknown, headers: Record<string, string> = {}) => {
      res.writeHead(status, { "Content-Type": "application/json", ...headers });
      res.end(JSON.stringify(payload));
    };
    const reply = (result: unknown, headers: Record<string, string> = {}) =>
      json(200, { jsonrpc: "2.0", id: body.id, result }, headers);
    const isModern = req.headers["mcp-protocol-version"] === "2026-07-28" && !!req.headers["mcp-method"];

    // Protected resource metadata for the sign-in modes.
    if (req.url?.startsWith("/.well-known/oauth-protected-resource")) {
      if (mode === "auth-no-metadata") return json(404, { error: "not found" });
      return json(200, { resource: "x", authorization_servers: ["https://auth.example.com"] });
    }

    switch (mode) {
      case "hang":
        return; // never answer
      case "html":
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end("<!doctype html><html><body>Welcome</body></html>");
      case "404":
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end("Not found");
      case "500":
        res.writeHead(500);
        return res.end("oops");
      case "530":
        res.writeHead(530, { "Content-Type": "text/html" });
        return res.end("<html>error 1033</html>");
      case "429":
        res.writeHead(429);
        return res.end();
      case "firewall":
        res.writeHead(403, { "Content-Type": "text/html" });
        return res.end("<html><title>Attention Required! | Cloudflare</title></html>");
      case "auth-good":
      case "auth-no-metadata":
        return json(401, { error: "unauthorized" }, {
          "WWW-Authenticate": `Bearer resource_metadata="http://${req.headers.host}/.well-known/oauth-protected-resource"`,
        });
      case "auth-no-header":
        return json(401, { error: "unauthorized" });
      case "sse-only":
        if (req.method === "GET") {
          res.writeHead(200, { "Content-Type": "text/event-stream" });
          res.write("event: endpoint\ndata: /messages?session=1\n\n");
          return; // keep the stream open, like a real SSE server
        }
        res.writeHead(405);
        return res.end();
    }

    // Modes that speak MCP.
    const modernOk = mode === "modern" || mode === "dual" || mode === "bad-schema" || mode === "no-descriptions" || mode === "no-tools-capability";

    if (body.method === "server/discover") {
      if (modernOk && isModern) {
        return reply({
          resultType: "complete",
          supportedVersions: mode === "dual" ? ["2026-07-28", "2025-11-25"] : ["2026-07-28"],
          capabilities: mode === "no-tools-capability" ? { resources: {} } : { tools: {} },
          _meta: { "io.modelcontextprotocol/serverInfo": { name: `mock-${mode}`, version: "1.0.0" } },
        });
      }
      // A legacy server doesn't know this method.
      return json(400, { jsonrpc: "2.0", id: body.id, error: { code: -32601, message: "Method not found" } });
    }

    if (body.method === "initialize") {
      if (mode === "modern") {
        // Modern-only servers reject the old handshake.
        return json(400, {
          jsonrpc: "2.0",
          id: body.id,
          error: { code: -32022, message: "Unsupported protocol version", data: { supported: ["2026-07-28"] } },
        });
      }
      const result = {
        protocolVersion: "2025-11-25",
        capabilities: { tools: {} },
        serverInfo: { name: `mock-${mode}`, version: "0.9.0" },
      };
      if (mode === "legacy-sse-reply") {
        res.writeHead(200, { "Content-Type": "text/event-stream", "Mcp-Session-Id": "abc123" });
        res.write(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: body.id, result })}\n\n`);
        return res.end();
      }
      return reply(result, { "Mcp-Session-Id": "abc123" });
    }

    if (body.method === "notifications/initialized") {
      res.writeHead(202);
      return res.end();
    }

    if (body.method === "tools/list") {
      if ((mode === "legacy" || mode === "legacy-sse-reply") && req.headers["mcp-session-id"] !== "abc123") {
        return json(400, { jsonrpc: "2.0", id: body.id, error: { code: -32000, message: "Missing session" } });
      }
      if (mode === "bad-schema") {
        return reply({ tools: [...goodTools, { name: "broken", description: "A tool with no schema at all." }] });
      }
      if (mode === "no-descriptions") {
        return reply({ tools: [{ name: "a", inputSchema: { type: "object" } }, { name: "b", description: "x", inputSchema: { type: "object" } }] });
      }
      return reply({ tools: goodTools });
    }

    if (body.method === "tools/call") {
      // Toolbeat must NEVER send this. Tests check that it doesn't.
      return reply({ content: [] });
    }

    return json(404, { jsonrpc: "2.0", id: body.id, error: { code: -32601, message: "Method not found" } });
  });

  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/mcp`,
    calls,
    close: () =>
      new Promise((r) => {
        server.closeAllConnections();
        server.close(() => r());
      }),
  };
}
