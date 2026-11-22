/** The docs sidebar, in reading order. */
export const DOCS_NAV = [
  {
    title: "Getting started",
    items: [
      { href: "/docs", label: "How a check works" },
      { href: "/docs/results", label: "Reading your result" },
    ],
  },
  {
    title: "The six steps",
    items: [
      { href: "/docs/checks/resolve", label: "1. Resolve" },
      { href: "/docs/checks/connect", label: "2. Secure connection" },
      { href: "/docs/checks/handshake", label: "3. MCP handshake" },
      { href: "/docs/checks/auth", label: "4. Sign-in (OAuth)" },
      { href: "/docs/checks/tools", label: "5. Tool list" },
      { href: "/docs/checks/quality", label: "6. Tool quality" },
    ],
  },
  {
    title: "Reference",
    items: [
      { href: "/docs/protocol-versions", label: "MCP versions" },
      { href: "/docs/api", label: "Check API" },
      { href: "/docs/safety", label: "Safety and privacy" },
      { href: "/bot", label: "About ToolbeatBot" },
    ],
  },
] as const;

/** Flat list, used for "previous / next" links. */
export const DOCS_ORDER = DOCS_NAV.flatMap((g) => g.items.filter((i) => i.href.startsWith("/docs")));
