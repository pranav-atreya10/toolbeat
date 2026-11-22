"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_NAV } from "@/lib/docs/nav";
import { cn } from "@/lib/utils";

export function DocsSidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Docs" className="text-sm">
      {DOCS_NAV.map((group) => (
        <div key={group.title} className="mb-6">
          <div className="mb-2 px-2.5 text-[13px] font-medium text-subtle">{group.title}</div>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "ghost block rounded-lg px-2.5 py-1.5",
                      active ? "bg-skip-bg font-medium text-ink" : "text-ink-2",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
