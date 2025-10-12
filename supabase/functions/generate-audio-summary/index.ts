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
    const { seniorUserId, checkInId } = await req.json()

    if (!seniorUserId) {
      throw new Error('Senior user ID is required')
    }

    console.log('Generating audio summary for senior:', seniorUserId, checkInId ? `checkIn: ${checkInId}` : '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let todayCheckIn: any
    let checkIns: any[]

    if (checkInId) {
      // Generate summary for a specific check-in
      const { data: singleCheckIn, error: checkInError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('id', checkInId)
        .eq('user_id', seniorUserId)
        .single()

      if (checkInError || !singleCheckIn) {
        console.error('Error fetching check-in:', checkInError)
        throw new Error('Check-in not found')
      }

      todayCheckIn = singleCheckIn
      checkIns = [singleCheckIn]
      console.log('Generating summary for specific check-in')
    } else {
      // Use the most recent check-in only (daily summary)
      const { data: fetchedCheckIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', seniorUserId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (checkInsError) {
        console.error('Error fetching check-ins:', checkInsError)
        throw checkInsError
      }

      if (!fetchedCheckIns || fetchedCheckIns.length === 0) {
        throw new Error('No check-ins found')
      }

      checkIns = fetchedCheckIns
      todayCheckIn = checkIns[0]
      console.log(`Using most recent check-in`)
    }

    // Generate summary text
    const summaryParts: string[] = []

    const getScoreLabel = (score: number) => {
      const s = Math.round(Number(score) || 0)
      if (s >= 5) return 'radiant'
      if (s === 4) return 'bright'
      if (s === 3) return 'steady'
      if (s === 2) return 'dim'
      return 'low'
    }

    // Always produce a daily summary based on the selected or most recent check-in
    summaryParts.push('Daily Health Summary.')
    
    if (todayCheckIn.highlights && Array.isArray(todayCheckIn.highlights) && todayCheckIn.highlights.length > 0) {
      summaryParts.push(`Highlights: ${todayCheckIn.highlights.join('. ')}.`)
    }

    if (todayCheckIn.concerns && Array.isArray(todayCheckIn.concerns) && todayCheckIn.concerns.length > 0) {
      summaryParts.push(`Concerns: ${todayCheckIn.concerns.join('. ')}.`)
    }

    const mentalScore = Math.round(Number(todayCheckIn.mental_health_score) || 3)
    const physicalScore = Math.round(Number(todayCheckIn.physical_health_score) || 3)
    const overallScore = Math.round(Number(todayCheckIn.overall_score) || 3)

    summaryParts.push(
      `Mental wellbeing is ${getScoreLabel(mentalScore)}, ` +
      `physical health is ${getScoreLabel(physicalScore)}, ` +
      `and overall wellness is ${getScoreLabel(overallScore)}.`
    )

    // Add urgent message if wellness is dim or low
    if (overallScore <= 2) {
      summaryParts.push('Please call your parents, they need your help.')
    }

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
    
    // Convert to base64 in chunks to avoid stack overflow
    const uint8Array = new Uint8Array(arrayBuffer)
    const chunkSize = 0x8000 // 32KB chunks
    let base64Audio = ''
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize)
      base64Audio += String.fromCharCode.apply(null, Array.from(chunk))
    }
    
    base64Audio = btoa(base64Audio)

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
