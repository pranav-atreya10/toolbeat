import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://toolbeat.tech"),
  title: {
    default: "Toolbeat: is your MCP server working?",
    template: "%s · Toolbeat",
  },
  description:
    "Toolbeat sends the same handshake Claude, ChatGPT and Cursor send to your MCP server, then shows you the exact step where it breaks.",
};

export const viewport: Viewport = {
  themeColor: "#FBFBFA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
