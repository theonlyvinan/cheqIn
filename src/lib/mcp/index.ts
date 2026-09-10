import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCheckInsTool from "./tools/list-check-ins";
import getCheckInTool from "./tools/get-check-in";
import listMedicationsTool from "./tools/list-medications";
import logMedicationTool from "./tools/log-medication";
import getProfileTool from "./tools/get-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "cheqin",
  title: "cheqin",
  version: "0.1.0",
  instructions:
    "Tools for cheqin, a wellness check-in app for seniors. Every tool acts as the signed-in user: read their recent check-ins and transcripts, their profile and health context, their medications, and log medication doses. Never infer medications or conditions that these tools do not return.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getProfileTool,
    listCheckInsTool,
    getCheckInTool,
    listMedicationsTool,
    logMedicationTool,
  ],
});
