import { buildBirdArtworkAgentPrompt } from "@/lib/flock/brief"

export const dynamic = "force-static"

export function GET() {
  return new Response(buildBirdArtworkAgentPrompt(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="murmur-bird-artwork-agent-prompt.md"',
      "Cache-Control": "public, max-age=3600",
    },
  })
}
