import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_check_ins",
  title: "List check-ins",
  description:
    "List the signed-in user's recent wellness check-ins with mood, sentiment and health scores.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10).describe("How many check-ins to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("check_ins")
      .select(
        "id, created_at, mood_rating, sleep_quality, pain_level, sentiment_label, sentiment_score, overall_score, physical_health_score, mental_health_score, highlights, concerns",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { check_ins: data ?? [] },
    };
  },
});
