import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    
    if (!text) {
      throw new Error('No text provided');
    }

    console.log('Analyzing sentiment for text...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a compassionate AI that analyzes emotional and physical wellbeing. Analyze the text and return ONLY a JSON object with:
- sentiment_score: -1 to 1 (negative to positive, legacy)
- sentiment_label: "very_negative", "negative", "neutral", "positive", or "very_positive"
- emotions: object with joy, sadness, anxiety, calm, pain (0-1 scale)
- highlights: array of positive moments, achievements, or good news mentioned
- concerns: array of any health/safety concerns detected
- mood_rating: 1-10 overall mood rating (legacy)
- mental_health_score: 1-5 (MindGlow: reflects mood, emotional tone, positivity, engagement)
- physical_health_score: 1-5 (BodyPulse: reflects energy, comfort, sleep, pain, activity)
- overall_score: 1-5 (Balance: harmony between mental and physical health)
- mental_indicators: array of strings describing mental health factors detected
- physical_indicators: array of strings describing physical health factors detected

Scoring guide:
1 = Low Glow (Very Concerned) - Signs of distress/fatigue
2 = Dim Glow (Concerned) - Slightly low energy/mood
3 = Steady Glow (Neutral) - Balanced and stable
4 = Bright Glow (Positive) - Good energy/mood
5 = Radiant Glow (Very Positive) - Excellent mood/energy

Example: {"sentiment_score": 0.6, "sentiment_label": "positive", "emotions": {"joy": 0.7, "sadness": 0.1, "anxiety": 0.2, "calm": 0.6, "pain": 0.3}, "highlights": ["Went for a walk", "Feeling positive"], "concerns": ["Mild back pain"], "mood_rating": 7, "mental_health_score": 4, "physical_health_score": 3, "overall_score": 3.5, "mental_indicators": ["positive outlook", "engaged conversation"], "physical_indicators": ["mild fatigue mentioned"]}`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    // Parse the JSON response
    const analysis = JSON.parse(analysisText);
    console.log('Sentiment analysis complete');

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-sentiment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
