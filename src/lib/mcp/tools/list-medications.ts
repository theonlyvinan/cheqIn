import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_medications",
  title: "List medications",
  description: "List the signed-in user's medications with dosage, frequency and schedule.",
  inputSchema: {
    include_inactive: z
      .boolean()
      .default(false)
      .describe("Include medications that are no longer active."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ include_inactive }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("medications")
      .select("id, name, dosage, frequency, time_of_day, instructions, active")
      .order("name", { ascending: true });
    if (!include_inactive) query = query.eq("active", true);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { medications: data ?? [] },
    };
  },
});
