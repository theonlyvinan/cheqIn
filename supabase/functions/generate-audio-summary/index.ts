import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { seniorUserId } = await req.json()

    if (!seniorUserId) {
      throw new Error('Senior user ID is required')
    }

    console.log('Generating audio summary for senior:', seniorUserId)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get the last 5 days of check-ins
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

    const { data: checkIns, error: checkInsError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', seniorUserId)
      .gte('created_at', fiveDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError)
      throw checkInsError
    }

    if (!checkIns || checkIns.length === 0) {
      throw new Error('No check-ins found in the last 5 days')
    }

    console.log(`Found ${checkIns.length} check-ins`)

    // Get the most recent check-in (today's)
    const todayCheckIn = checkIns[0]

    // Generate summary text
    const summaryParts: string[] = []

    // Today's summary
    summaryParts.push('Daily Health Summary.')
    
    if (todayCheckIn.highlights && Array.isArray(todayCheckIn.highlights) && todayCheckIn.highlights.length > 0) {
      summaryParts.push(`Today's highlights: ${todayCheckIn.highlights.join('. ')}.`)
    }

    if (todayCheckIn.concerns && Array.isArray(todayCheckIn.concerns) && todayCheckIn.concerns.length > 0) {
      summaryParts.push(`Concerns: ${todayCheckIn.concerns.join('. ')}.`)
    }

    // Calculate 5-day averages
    const avgMentalScore = checkIns.reduce((sum, ci) => sum + (ci.mental_health_score || 0), 0) / checkIns.length
    const avgPhysicalScore = checkIns.reduce((sum, ci) => sum + (ci.physical_health_score || 0), 0) / checkIns.length
    const avgOverallScore = checkIns.reduce((sum, ci) => sum + (ci.overall_score || 0), 0) / checkIns.length

    const getScoreLabel = (score: number) => {
      if (score >= 4) return 'radiant'
      if (score >= 3) return 'bright'
      if (score >= 2) return 'steady'
      if (score >= 1) return 'dim'
      return 'low'
    }

    summaryParts.push(
      `Five day overview: Mental wellbeing is ${getScoreLabel(avgMentalScore)}, ` +
      `physical health is ${getScoreLabel(avgPhysicalScore)}, ` +
      `and overall wellness is ${getScoreLabel(avgOverallScore)}.`
    )

    const summaryText = summaryParts.join(' ')

    console.log('Generated summary text:', summaryText)

    // Generate audio using ElevenLabs
    const ELEVEN_LABS_API_KEY = Deno.env.get('ELEVEN_LABS_API_KEY')
    if (!ELEVEN_LABS_API_KEY) {
      throw new Error('ELEVEN_LABS_API_KEY is not configured')
    }

    const voiceId = 'EXAVITQu4vr4xnSDxMaL' // Sarah - warm, natural voice

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_LABS_API_KEY,
      },
      body: JSON.stringify({
        text: summaryText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('ElevenLabs API error:', error)
      throw new Error('Failed to generate speech')
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    console.log('Audio generation successful')

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        summaryText,
        checkInsCount: checkIns.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in generate-audio-summary:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
