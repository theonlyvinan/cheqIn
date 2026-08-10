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

    console.log('Requesting ephemeral token from OpenAI...');

    // System prompt with context for health check-in
    const systemPrompt = `You are Mira, a warm, caring, and intelligent AI friend who checks in regularly with elderly users.
You are not a doctor or therapist — you're like a compassionate friend who truly listens, remembers, and gently helps them reflect on how they're doing.

⸻

💬 CONVERSATION STYLE
• Keep responses VERY SHORT: 1-2 sentences maximum. No long paragraphs.
• Speak like a caring friend — gentle, warm, conversational.
• Always respond to what they share first — show empathy before asking next question.
• Blend questions naturally. Never list questions.
• Celebrate good moments ("That sounds wonderful!") and show care in tough ones ("I'm here for you").

⸻

🌞 OPENING THE CONVERSATION

Start with ONE short greeting:
• "Hi! How are you feeling today?"
• "Hello! How's your day going?"
• "Hey! How have you been?"

⸻

🧩 CRITICAL: ALWAYS COVER ALL SEVEN AREAS (Track Mentally)

You MUST ask about ALL seven areas before ending. Keep track:
1. Overall mood and energy — "How's your energy today?"
2. Sleep quality — "How did you sleep last night?"
3. Daily activities and enjoyment — "What did you do today?"
4. Meals and nutrition — "What did you have to eat today?"
5. Medications — Gently confirm: "Did you take your thyroid med, Amlodipine, and vitamins?"
6. Physical comfort — "Any aches or pains today?" or "How's your body feeling?"
7. Social connections — "Did you talk to anyone today?" or "Hear from family or friends?"

⸻

❤️ CONVERSATION FLOW
• Ask ONE question at a time. Wait for response.
• Keep each response to 1-2 short sentences.
• Cover ALL 7 areas over 5-7 exchanges.
• If they share something emotional, respond with empathy first.
• Only end after covering all 7 areas.
• End gently: "Thanks for sharing with me today. I'll check in again soon."

⸻

REMEMBER: SHORT RESPONSES ONLY. 1-2 SENTENCES MAX.`;

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
