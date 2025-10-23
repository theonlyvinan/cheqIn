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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get all check-ins without audio summaries but with transcripts
    const { data: checkIns, error: fetchError } = await supabase
      .from('check_ins')
      .select('*')
      .is('audio_summary_url', null)
      .not('transcript', 'is', null)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching check-ins:', fetchError)
      throw fetchError
    }

    if (!checkIns || checkIns.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No check-ins to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${checkIns.length} check-ins to process`)

    const ELEVEN_LABS_API_KEY = Deno.env.get('ELEVEN_LABS_API_KEY')
    if (!ELEVEN_LABS_API_KEY) {
      throw new Error('ELEVEN_LABS_API_KEY is not configured')
    }

    let processed = 0
    let failed = 0

    for (const checkIn of checkIns) {
      try {
        console.log(`Processing check-in ${checkIn.id}`)

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

        summaryParts.push('Daily Health Summary.')
        
        if (checkIn.highlights && Array.isArray(checkIn.highlights) && checkIn.highlights.length > 0) {
          summaryParts.push(`Highlights: ${checkIn.highlights.join('. ')}.`)
        }

        if (checkIn.concerns && Array.isArray(checkIn.concerns) && checkIn.concerns.length > 0) {
          summaryParts.push(`Concerns: ${checkIn.concerns.join('. ')}.`)
        }

        const mentalScore = Math.round(Number(checkIn.mental_health_score) || 3)
        const physicalScore = Math.round(Number(checkIn.physical_health_score) || 3)
        const overallScore = Math.round(Number(checkIn.overall_score) || 3)

        summaryParts.push(
          `Mental wellbeing is ${getScoreLabel(mentalScore)}, ` +
          `physical health is ${getScoreLabel(physicalScore)}, ` +
          `and overall wellness is ${getScoreLabel(overallScore)}.`
        )

        if (overallScore <= 2) {
          summaryParts.push('Please call your parents, they need your help.')
        }

        const summaryText = summaryParts.join(' ')

        console.log('Generated summary text:', summaryText)

        // Generate audio using ElevenLabs
        const voiceId = 'EXAVITQu4vr4xnSDxMaL' // Sarah

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

        // Store audio in Storage
        const filePath = `${checkIn.user_id}/${checkIn.id}.mp3`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audio-summaries')
          .upload(filePath, arrayBuffer, { contentType: 'audio/mpeg', upsert: true })

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          throw uploadError
        }

        // Update the check-in with audio metadata
        const { error: updateError } = await supabase
          .from('check_ins')
          .update({
            audio_summary_url: uploadData?.path || filePath,
            audio_summary_text: summaryText,
            audio_summary_generated_at: new Date().toISOString(),
          })
          .eq('id', checkIn.id)

        if (updateError) {
          console.error('Failed to update check-in:', updateError)
          throw updateError
        }

        console.log(`Successfully processed check-in ${checkIn.id}`)
        processed++

      } catch (error) {
        console.error(`Failed to process check-in ${checkIn.id}:`, error)
        failed++
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Backfill completed',
        total: checkIns.length,
        processed,
        failed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in backfill-audio-summaries:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
