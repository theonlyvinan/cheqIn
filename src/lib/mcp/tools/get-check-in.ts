import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_check_in",
  title: "Get check-in detail",
  description:
    "Get one of the signed-in user's check-ins in full, including the conversation transcript and summary.",
  inputSchema: {
    check_in_id: z.string().uuid().describe("The id of the check-in to fetch."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ check_in_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("check_ins")
      .select(
        "id, created_at, transcript, notes, audio_summary_text, mood_rating, sleep_quality, pain_level, sentiment_label, sentiment_score, overall_score, physical_health_score, mental_health_score, emotions, highlights, concerns, physical_indicators, mental_indicators",
      )
      .eq("id", check_in_id)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: "No check-in found with that id." }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { check_in: data },
    };
  },
});
