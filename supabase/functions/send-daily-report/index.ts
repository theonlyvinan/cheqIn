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
    const { seniorUserId, familyMemberEmail } = await req.json()

    if (!seniorUserId || typeof seniorUserId !== 'string') {
      throw new Error('Senior user ID is required')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // --- Authentication & authorization ---
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isServiceCall = token === supabaseKey

    if (!isServiceCall) {
      const { data: userData, error: userError } = await supabase.auth.getUser(token)
      const callerId = userData?.user?.id
      if (userError || !callerId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (callerId !== seniorUserId) {
        const { data: link } = await supabase
          .from('family_members')
          .select('id')
          .eq('senior_user_id', seniorUserId)
          .eq('family_user_id', callerId)
          .maybeSingle()

        if (!link) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    console.log('Sending daily report for senior:', seniorUserId)

    // Generate audio summary
    const { data: summaryData, error: summaryError } = await supabase.functions.invoke(
      'generate-audio-summary',
      {
        body: { seniorUserId },
        headers: { Authorization: `Bearer ${supabaseKey}` },
      }
    )

    if (summaryError) {
      console.error('Error generating summary:', summaryError)
      throw summaryError
    }

    console.log('Audio summary generated successfully')

    // Get family members registered for this senior. Recipients are ALWAYS
    // resolved server-side; a client-supplied email may only narrow this list.
    const { data: familyMembers, error: familyError } = await supabase
      .from('family_members')
      .select('email, report_settings(enabled)')
      .eq('senior_user_id', seniorUserId)
      .not('email', 'is', null)

    if (familyError) {
      console.error('Error fetching family members:', familyError)
      throw familyError
    }

    // Filter for members with reports enabled (or no settings = default enabled)
    let recipients: string[] = (familyMembers ?? [])
      .filter(fm => !fm.report_settings || fm.report_settings.length === 0 || fm.report_settings[0]?.enabled)
      .map(fm => fm.email)
      .filter(Boolean)

    if (familyMemberEmail) {
      const requested = String(familyMemberEmail).toLowerCase()
      const allowed = recipients.filter(e => e.toLowerCase() === requested)
      if (allowed.length === 0) {
        return new Response(JSON.stringify({ error: 'Recipient is not a registered family member for this senior' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      recipients = allowed
    }


    if (recipients.length === 0) {
      // Fallback: send to senior user's own email so they can verify delivery
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(seniorUserId)
      if (userError || !userData?.user?.email) {
        throw new Error('No recipients found for report')
      }
      recipients = [userData.user.email]
      console.log('No family recipients configured; falling back to senior user email')
    }

    console.log(`Sending report to ${recipients.length} recipients`)

    // Send email with Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const audioBuffer = Uint8Array.from(atob(summaryData.audioContent), c => c.charCodeAt(0))

    for (const email of recipients) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CheqIn Health <onboarding@resend.dev>',
          to: [email],
          subject: 'Daily Health Summary',
          html: `
            <h2>Daily Health Summary</h2>
            <p>Here's today's health update:</p>
            <p>${summaryData.summaryText}</p>
            <p>Listen to the audio summary attached to this email.</p>
            <p><em>Based on ${summaryData.checkInsCount} check-ins from the last 5 days.</em></p>
          `,
          attachments: [
            {
              filename: 'health-summary.mp3',
              content: summaryData.audioContent,
              content_type: 'audio/mpeg'
            },
          ],
        }),
      })

      if (!emailResponse.ok) {
        const error = await emailResponse.text()
        console.error('Resend API error:', error)
        throw new Error('Failed to send email')
      }

      console.log(`Email sent successfully to ${email}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        recipientCount: recipients.length,
        message: 'Daily reports sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in send-daily-report:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
