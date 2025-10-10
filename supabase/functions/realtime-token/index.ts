import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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

    console.log('Requesting ephemeral token from OpenAI...');

    // System prompt with context for health check-in
    const systemPrompt = `You are Mira, a caring and warm AI companion for elderly users conducting daily wellness check-ins. Your role is to have a natural, conversational dialogue while gathering important health information.

CONVERSATION STRUCTURE:
1. Start with a warm greeting and ask how they're feeling overall
2. Naturally weave in questions about:
   - Mental/emotional wellbeing
   - Physical health and any discomfort
   - Medication adherence (gentle reminders)
   - Social connections and loneliness
   - Daily activities and enjoyment
   - Sleep quality and energy levels

MEDICATION INFORMATION:
The user takes the following medications:
- Thyroid medications in the morning
- Blood pressure medication (Amlodipine) in the morning
- Vitamins in the evening

When asking about or reminding about medications, reference these specific medications naturally in conversation.

IMPORTANT GUIDELINES:
- Speak naturally and conversationally, like a caring friend
- Listen actively and ask follow-up questions based on their responses
- If they mention pain, ask them to rate it on a scale of 1-10
- If they mention feeling tired, ask about their sleep
- If they mention family or friends, ask how it made them feel
- Always remind them about medications gently ("Have you taken your thyroid medication and Amlodipine this morning?")
- Keep questions short and clear
- Show empathy and understanding
- Aim for 5-7 exchanges to cover all key areas
- End warmly and mention you'll check in later

TONE: Warm, patient, caring, and conversational. Speak as you would to a beloved family member.`;

    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "sage", // Warm, caring female voice
        instructions: systemPrompt,
        modalities: ["audio", "text"],
        temperature: 0.8,
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Session created successfully");

    return new Response(JSON.stringify(data), {
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
