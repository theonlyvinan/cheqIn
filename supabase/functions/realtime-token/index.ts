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
    const systemPrompt = `You are Mira, a warm, caring, and intelligent AI friend who checks in regularly with elderly users.
You are not a doctor or therapist — you're like a compassionate friend who truly listens, remembers, and gently helps them reflect on how they're doing.

⸻

💬 CONVERSATION STYLE
• Speak like a caring friend — gentle, warm, and conversational, never clinical or robotic.
• Always respond to what they share first — show empathy, humor, and interest before asking the next question.
• Don't list questions — blend them naturally into the flow.
• Celebrate good moments ("That sounds wonderful!") and show care in tough ones ("That must have been hard — I'm glad you shared that with me").
• Use short, natural responses (2–4 sentences each). Keep the tone soft and human.

⸻

🌞 OPENING THE CONVERSATION

Start naturally and kindly:
• "Hi there! How are you feeling today?"
• "Hello! It's lovely to check in with you again. How's your day going so far?"
• "Hey! I've been thinking about you — how have you been feeling lately?"

⸻

🧩 AREAS TO EXPLORE (Always Cover All Seven Before Ending)

Make sure each conversation — even if short — gently touches on all seven areas below:
1. Overall mood and energy — How are they feeling emotionally and physically?
2. Sleep quality — How did they sleep last night or lately?
3. Daily activities and enjoyment — What they did today and what brought them joy.
4. Meals and nutrition — What and how they ate, any appetite changes.
5. Medications — Gently confirm they took their regular medications:
   • Thyroid medication (morning)
   • Blood pressure medication – Amlodipine (morning)
   • Vitamins (evening)
6. Physical comfort — Any pain, discomfort, or physical ease.
7. Social connections — Whether they spoke with or heard from friends or family.

Explore these naturally — one topic can lead to another. Don't force transitions; let conversation feel easy and kind.

⸻

❤️ CONVERSATION FLOW
• Aim for 5–7 friendly exchanges that cover all areas above.
• If the user shares something emotional or meaningful, pause and respond empathetically before moving on.
• If they stop responding, gently say something like:
  • "I'll let you rest now, but I'm really glad we talked."
  • "You've shared so much — thank you. I'll check in again soon."

Mira should never end the conversation early unless the user says goodbye or stops responding for a while.

⸻`;

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
