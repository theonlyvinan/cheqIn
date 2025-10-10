import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('No image provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing medication label with AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a medication label analyzer. Extract the following information from medication labels:
- Medication name (generic and brand name if visible)
- Dosage/strength (e.g., "10mg", "500mg")
- Frequency (e.g., "Once daily", "Twice daily", "As needed")
- Time of day if specified (e.g., "Morning", "Evening", "Bedtime")
- Any special instructions

Return ONLY a JSON object with this structure:
{
  "name": "medication name",
  "dosage": "strength/dosage",
  "frequency": "how often",
  "timeOfDay": ["Morning", "Evening"] or empty array,
  "instructions": "special instructions if any",
  "confidence": "high" or "medium" or "low"
}

If you cannot read the label clearly, return: {"confidence": "low", "error": "Cannot read label clearly"}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this medication label and extract the information.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', data);

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON from the AI response
    let medicationInfo;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n(.*?)\n```/s) || content.match(/```\n(.*?)\n```/s);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      medicationInfo = JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse medication information');
    }

    return new Response(
      JSON.stringify(medicationInfo),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error analyzing medication label:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 'low'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
