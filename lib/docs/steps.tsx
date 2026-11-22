/**
 * Written content for the six "check step" docs pages.
 * The list of possible results on each page comes from lib/checks/messages.ts,
 * so it always matches what the checker says.
 */
import Link from "next/link";
import type { StepId } from "@/lib/checks/types";

export interface StepDoc {
  id: StepId;
  number: number;
  title: string;
  intro: string;
  body: React.ReactNode;
}

export const STEP_DOCS: StepDoc[] = [
  {
    id: "resolve",
    number: 1,
    title: "Resolve",
    intro: "Toolbeat looks up your server’s domain name to find the address of the computer behind it.",
    body: (
      <>
        <h2>What this step checks</h2>
        <p>
          Every connection starts with DNS, the internet’s phone book. Toolbeat asks DNS for the IP addresses of the
          host in your URL, for example <code>mcp.yourcompany.com</code>. If DNS can’t answer, no AI client can find
          your server.
        </p>
        <p>
          Toolbeat also checks that every address is on the public internet. If your domain points at a private
          address (like <code>10.0.0.5</code> or <code>localhost</code>), clients outside your network can’t reach
          it, and Toolbeat refuses to connect for safety reasons. See <Link href="/docs/safety">Safety and privacy</Link>.
        </p>
        <h2>Before this step: the URL itself</h2>
        <p>The URL has to be a full HTTPS address with no password in it, on port 443 or a port above 1023.</p>
        <h2>How to check it yourself</h2>
        <pre>
          <code>dig +short mcp.yourcompany.com</code>
        </pre>
        <p>If this prints nothing, the DNS record is missing.</p>
      </>
    ),
  },
  {
    id: "connect",
    number: 2,
    title: "Secure connection",
    intro: "Toolbeat opens an encrypted HTTPS connection and checks the certificate, just like a browser or AI client would.",
    body: (
      <>
        <h2>What this step checks</h2>
        <ul>
          <li>Something is listening on the port (usually 443).</li>
          <li>The TLS handshake completes in time (12 seconds at most).</li>
          <li>The certificate is valid, not expired, issued by a trusted authority, and covers your exact hostname.</li>
        </ul>
        <p>
          Toolbeat also warns you when your certificate expires within 14 days, so you can renew it before clients
          start refusing to connect.
        </p>
        <h2>How to check it yourself</h2>
        <pre>
          <code>openssl s_client -connect mcp.yourcompany.com:443 -servername mcp.yourcompany.com</code>
        </pre>
        <p>
          Look for <code>Verify return code: 0 (ok)</code> near the end.
        </p>
      </>
    ),
  },
  {
    id: "handshake",
    number: 3,
    title: "MCP handshake",
    intro:
      "This is the step that regular uptime monitors skip. Toolbeat sends a real MCP request and checks that the answer is a real MCP response.",
    body: (
      <>
        <h2>What this step checks</h2>
        <p>
          An MCP server can return <code>200 OK</code> to a simple ping while every AI client fails to connect, for
          example because the path serves your website instead of your MCP handler. So Toolbeat talks to your server
          the way Claude, ChatGPT and Cursor do.
        </p>
        <ol>
          <li>
            It first tries the current MCP spec (<code>2026-07-28</code>), which has no handshake. It sends a
            stateless <code>server/discover</code> request.
          </li>
          <li>
            If the server doesn’t speak that version, Toolbeat falls back to the previous spec (
            <code>2025-11-25</code>) and sends the classic <code>initialize</code> handshake.
          </li>
          <li>
            If both fail with 400, 404 or 405, Toolbeat checks whether the server only speaks the old, deprecated SSE
            transport.
          </li>
        </ol>
        <p>
          A server passes when it returns a valid JSON-RPC <code>result</code>, or a <code>401</code> that asks the
          client to sign in (checked in the <Link href="/docs/checks/auth">next step</Link>). Read more in{" "}
          <Link href="/docs/protocol-versions">MCP versions</Link>.
        </p>
        <h2>The request Toolbeat sends</h2>
        <pre>
          <code>{`POST /mcp
Content-Type: application/json
Accept: application/json, text/event-stream
MCP-Protocol-Version: 2026-07-28
Mcp-Method: server/discover
User-Agent: ToolbeatBot/0.1 (+https://toolbeat.tech/bot)

{"jsonrpc":"2.0","id":1,"method":"server/discover",
 "params":{"_meta":{
   "io.modelcontextprotocol/protocolVersion":"2026-07-28",
   "io.modelcontextprotocol/clientInfo":{"name":"toolbeat","version":"0.1"},
   "io.modelcontextprotocol/clientCapabilities":{}}}}`}</code>
        </pre>
        <p>And the fallback for servers on the previous spec:</p>
        <pre>
          <code>{`{"jsonrpc":"2.0","id":1,"method":"initialize",
 "params":{"protocolVersion":"2025-11-25","capabilities":{},
   "clientInfo":{"name":"toolbeat","version":"0.1"}}}`}</code>
        </pre>
        <p>
          Replies can be plain JSON or a Server-Sent Events stream. Toolbeat reads both. A <code>429</code> reply
          means “slow down”, so Toolbeat reports it as rate limited, not as a failure.
        </p>
      </>
    ),
  },
  {
    id: "auth",
    number: 4,
    title: "Sign-in (OAuth)",
    intro:
      "Only runs when your server asks clients to sign in. Toolbeat checks that clients get everything they need to start the OAuth sign-in flow.",
    body: (
      <>
        <h2>What this step checks</h2>
        <p>
          Many MCP servers need a signed-in user. That’s fine: a <code>401 Unauthorized</code> is the correct answer
          to a request without a token. But the client has to learn <em>where</em> to sign in, or it gives up.
        </p>
        <ol>
          <li>
            The 401 response includes a <code>WWW-Authenticate</code> header, ideally with a{" "}
            <code>resource_metadata</code> link.
          </li>
          <li>
            The protected resource metadata (at the linked URL, or at{" "}
            <code>/.well-known/oauth-protected-resource</code>) returns JSON with an{" "}
            <code>authorization_servers</code> list.
          </li>
        </ol>
        <h2>A correct response looks like this</h2>
        <pre>
          <code>{`HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="https://mcp.yourcompany.com/.well-known/oauth-protected-resource"`}</code>
        </pre>
        <pre>
          <code>{`GET /.well-known/oauth-protected-resource

{
  "resource": "https://mcp.yourcompany.com/mcp",
  "authorization_servers": ["https://auth.yourcompany.com"]
}`}</code>
        </pre>
        <p>
          Toolbeat doesn’t sign in, so for these servers it can’t list tools. Signed-in “deep checks” with a test
          token are planned for later.
        </p>
      </>
    ),
  },
  {
    id: "tools",
    number: 5,
    title: "Tool list",
    intro: "Toolbeat asks your server which tools it offers, and checks that each one is described in a way clients can use.",
    body: (
      <>
        <h2>What this step checks</h2>
        <p>
          After a successful handshake, Toolbeat sends <code>tools/list</code>. On the previous spec it first sends
          the <code>notifications/initialized</code> message and includes your <code>Mcp-Session-Id</code>, if your
          server gave one.
        </p>
        <p>
          Every tool must have an <code>inputSchema</code> with <code>&quot;type&quot;: &quot;object&quot;</code>.
          Clients reject tools with a missing or broken schema, often silently.
        </p>
        <pre>
          <code>{`{
  "name": "search_docs",
  "description": "Search the product docs and return the best matching pages.",
  "inputSchema": {
    "type": "object",
    "properties": { "query": { "type": "string" } },
    "required": ["query"]
  }
}`}</code>
        </pre>
        <p>
          Toolbeat <strong>never calls your tools</strong>. It only lists them. If your server doesn’t offer tools at
          all (for example it only has resources), this step is skipped.
        </p>
      </>
    ),
  },
  {
    id: "quality",
    number: 6,
    title: "Tool quality",
    intro: "A warning-only step. Toolbeat checks that your tools are described well enough for an AI model to pick the right one.",
    body: (
      <>
        <h2>What this step checks</h2>
        <ul>
          <li>Every tool has a description of at least 10 characters.</li>
          <li>The server lists at least one tool.</li>
        </ul>
        <p>
          These never make a check fail, because the server still works. But models choose tools by reading their
          descriptions, so a tool without one is easy to miss or misuse.
        </p>
        <h2>Writing a good description</h2>
        <p>Say what the tool does, what it returns, and when to use it. One or two sentences is enough.</p>
        <pre>
          <code>{`Bad:  "search"
Good: "Search the product docs by keyword. Returns up to 5 pages with titles and links. Use this before answering product questions."`}</code>
        </pre>
      </>
    ),
  },
];

export function getStepDoc(id: string) {
  return STEP_DOCS.find((s) => s.id === id);
}
