import { DocsSidebar } from "@/components/docs-sidebar";

export default function DocsLayout({ children }: LayoutProps<"/docs">) {
  return (
    <div className="mx-auto flex max-w-[1120px] gap-12 px-4 pt-10 pb-24 sm:px-6 sm:pt-14">
      <aside className="hidden w-[220px] flex-none md:block">
        <div className="sticky top-24">
          <DocsSidebar />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {children}
        <details className="mt-16 rounded-xl border border-line bg-surface p-4 md:hidden">
          <summary className="cursor-pointer text-sm font-medium">All docs pages</summary>
          <div className="mt-4">
            <DocsSidebar />
          </div>
        </details>
      </div>
    </div>
  );
}
