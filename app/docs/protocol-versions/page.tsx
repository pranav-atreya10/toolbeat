import type { Metadata } from "next";
import { DocsPage, Note } from "@/components/docs-page";

export const metadata: Metadata = {
  title: "MCP versions",
  description: "Which versions of the Model Context Protocol Toolbeat supports, and how it detects them.",
};

export default function VersionsDoc() {
  return (
    <DocsPage
      href="/docs/protocol-versions"
      eyebrow="Reference"
      title="MCP versions"
      intro="The MCP spec changes often. Toolbeat supports the current version and the one before it, and works out which one your server speaks."
    >
      <h2>Supported versions</h2>
      <ul>
        <li>
          <strong>
            <code>2026-07-28</code>
          </strong>{" "}
          (current). Stateless: there’s no handshake and no session. Every request carries its protocol version,
          client info and capabilities in <code>_meta</code>, plus <code>MCP-Protocol-Version</code> and{" "}
          <code>Mcp-Method</code> headers. Servers must answer <code>server/discover</code>.
        </li>
        <li>
          <strong>
            <code>2025-11-25</code>
          </strong>{" "}
          (previous). Clients start with an <code>initialize</code> request, the server may hand back an{" "}
          <code>Mcp-Session-Id</code>, and the client sends <code>notifications/initialized</code> before anything
          else.
        </li>
      </ul>
      <p>
        Servers on older versions of the previous style (like <code>2025-06-18</code>) usually still pass, because
        the server picks the version it answers with during <code>initialize</code>.
      </p>

      <h2>How Toolbeat works out the version</h2>
      <p>Toolbeat follows the compatibility rules in the 2026-07-28 spec:</p>
      <ol>
        <li>
          Send a current-spec <code>server/discover</code> request.
        </li>
        <li>
          If the server answers with a result, it speaks the current spec. Done.
        </li>
        <li>
          If it answers with an <code>Unsupported protocol version</code> error (code <code>-32022</code>), Toolbeat
          reads the <code>supported</code> list and uses a version they both speak.
        </li>
        <li>
          If it answers with anything else (an unknown-method error, a 400, 404 or 405), it’s an older server, so
          Toolbeat falls back to <code>initialize</code> and judges the server on that.
        </li>
        <li>
          If <code>initialize</code> also fails with 400, 404 or 405, Toolbeat tries the deprecated HTTP+SSE
          transport: a GET that should open an event stream.
        </li>
      </ol>
      <Note>
        <p>
          A current-spec server that rejects <code>initialize</code> is <strong>not</strong> a failure. That’s the
          spec working as intended.
        </p>
      </Note>

      <h2>The deprecated SSE transport</h2>
      <p>
        The original HTTP+SSE transport (from <code>2024-11-05</code>) has been deprecated since{" "}
        <code>2025-03-26</code>. Toolbeat checks that it connects and shows a warning. It doesn’t list tools over it.
        Move to Streamable HTTP when you can.
      </p>
    </DocsPage>
  );
}
