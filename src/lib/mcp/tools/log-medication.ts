import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "log_medication",
  title: "Log a medication dose",
  description:
    "Record whether the signed-in user took one of their medications. The medication must belong to them.",
  inputSchema: {
    medication_id: z.string().uuid().describe("The id of the medication, from list_medications."),
    was_taken: z.boolean().describe("True if the dose was taken, false if it was missed."),
    notes: z.string().trim().max(500).optional().describe("Optional note about this dose."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ medication_id, was_taken, notes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const { data: med, error: medError } = await supabase
      .from("medications")
      .select("id, name")
      .eq("id", medication_id)
      .maybeSingle();
    if (medError) return { content: [{ type: "text", text: medError.message }], isError: true };
    if (!med) {
      return {
        content: [{ type: "text", text: "That medication was not found for this user." }],
        isError: true,
      };
    }

    const { data, error } = await supabase
      .from("medication_logs")
      .insert({
        user_id: ctx.getUserId(),
        medication_id,
        was_taken,
        notes: notes ?? null,
      })
      .select("id, medication_id, was_taken, taken_at, notes")
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [
        {
          type: "text",
          text: `Logged ${med.name} as ${was_taken ? "taken" : "not taken"}.`,
        },
      ],
      structuredContent: { log: data },
    };
  },
});
