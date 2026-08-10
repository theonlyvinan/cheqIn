import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Load the signed-in user's real profile + medications for personalization
    let userName = "";
    let medsLine = "Gently ask if they took their medications today. Do NOT name any specific medication.";
    let healthLine = "";
    try {
      const authHeader = req.headers.get("Authorization") ?? "";
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) {
        const [{ data: profile }, { data: meds }] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, physical_health_issues, mental_health_issues")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("medications")
            .select("name, dosage, time_of_day")
            .eq("user_id", user.id)
            .eq("active", true),
        ]);
        userName = profile?.full_name?.split(" ")[0] ?? "";
        if (meds && meds.length > 0) {
          const list = meds
            .map((m: any) => [m.name, m.dosage].filter(Boolean).join(" "))
            .join(", ");
          medsLine = `Gently confirm ONLY these medications, by name, exactly as listed: ${list}. Never invent or mention any medication that is not on this list.`;
        } else {
          medsLine =
            "They have no medications on file. Ask generally: \"Did you take any medications today?\" Do NOT name any specific medication.";
        }

        const conditions = [
          profile?.physical_health_issues && `Physical: ${profile.physical_health_issues}`,
          profile?.mental_health_issues && `Mental/emotional: ${profile.mental_health_issues}`,
        ].filter(Boolean);
        if (conditions.length > 0) {
          healthLine = `\n\n🩺 THEIR KNOWN HEALTH CONTEXT (use gently; never diagnose, never invent conditions):\n${conditions.join("\n")}`;
        }
      }
    } catch (e) {
      console.error("Failed to load user context:", e);
    }


    console.log('Requesting ephemeral token from OpenAI...');

    // System prompt with context for health check-in
    const systemPrompt = `You are Mira, a warm, caring, and intelligent AI friend who checks in regularly with elderly users.
You are not a doctor or therapist — you're like a compassionate friend who truly listens, remembers, and gently helps them reflect on how they're doing.

⸻

💬 CONVERSATION STYLE
• Keep responses VERY SHORT: 1-2 sentences maximum. No long paragraphs.
• Speak like a caring friend — gentle, warm, conversational.
• Always respond to what they share first — show empathy before asking next question.
• Ask exactly ONE question in each response. Never combine, stack, or list questions.
• Celebrate good moments ("That sounds wonderful!") and show care in tough ones ("I'm here for you").

⸻

🌞 OPENING THE CONVERSATION

Start with ONE short greeting${userName ? `, using their first name "${userName}"` : ""}:
• "Hi${userName ? ` ${userName}` : ""}! How are you feeling today?"
• "Hello${userName ? ` ${userName}` : ""}! How's your day going?"
• "Hey${userName ? ` ${userName}` : ""}! How have you been?"

⸻

🧩 CRITICAL: ALWAYS COVER ALL SEVEN AREAS (Track Mentally)

You MUST ask about ALL seven areas before ending. Keep track:
1. Overall mood and energy — "How's your energy today?"
2. Sleep quality — "How did you sleep last night?"
3. Daily activities and enjoyment — "What did you do today?"
4. Meals and nutrition — "What did you have to eat today?"
5. Medications — ${medsLine}
6. Physical comfort — "Any aches or pains today?" or "How's your body feeling?"
7. Social connections — "Did you talk to anyone today?" or "Hear from family or friends?"

⸻

❤️ CONVERSATION FLOW
• STRICT TURN-TAKING: Ask exactly ONE question, then STOP speaking and WAIT for the user's next completed turn.
• Never answer your own question. Never ask a follow-up question until the user has spoken again.
• After each user answer, briefly acknowledge it and ask exactly ONE next question.
• Keep each response to 1-2 short sentences.
• Cover ALL 7 areas over at least 7 user exchanges, unless the user naturally answers more than one area at once.
• If they share something emotional, respond with empathy first.
• Only end after covering all 7 areas.
• End gently: "Thanks for sharing with me today. I'll check in again soon."

⸻

🚫 NEVER INVENT DETAILS
• Only reference facts given to you in this prompt (their name, medications, health context).
• Never assume conditions, medications, family members, hobbies, or events that were not provided.
• If you don't know something, ask an open question instead of guessing.${healthLine}

⸻

🌐 LANGUAGE
• ALWAYS speak and respond in English, including the very first greeting.
• Never start or switch to Spanish, Portuguese, or any other language, even if audio is unclear.
• Only switch languages if the user explicitly asks you to in English.

⸻

REMEMBER: SHORT RESPONSES ONLY. 1-2 SENTENCES MAX. ENGLISH ONLY.`;

    // Request an ephemeral token from OpenAI (GA endpoint)
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime",
          instructions: systemPrompt,
          audio: {
            input: {
              transcription: { model: "whisper-1" },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000,
              },
            },
            output: { voice: "sage" },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Session created successfully");

    // Normalize to the shape the client expects
    return new Response(JSON.stringify({ ...data, client_secret: { value: data.value } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
