import { ChevronDown } from "lucide-react"

export function Disclosure({
  label,
  summary,
  children,
}: {
  label: string
  summary: string
  children: React.ReactNode
}) {
  return (
    <details className="group rounded-lg border border-border bg-secondary/25">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-xs font-medium text-foreground">{label}</span>
          <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">{summary}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
        {children}
      </div>
    </details>
  )
}
