import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface CheckInSummaryProps {
  seniorName?: string
  summaryText?: string
  checkInsCount?: number
  isDaily?: boolean
  audioUrl?: string
}

export const CheckInSummaryEmail = ({
  seniorName = 'your loved one',
  summaryText = 'No summary available.',
  checkInsCount,
  isDaily = false,
  audioUrl,
}: CheckInSummaryProps) => (
  <Html>
    <Head />
    <Preview>{isDaily ? 'Daily health summary' : 'New check-in summary'}</Preview>
    <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <Container style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '12px', margin: '32px auto', maxWidth: '560px' }}>
        <Heading style={{ fontSize: '20px', margin: '0 0 16px' }}>
          {isDaily ? 'Daily Health Summary' : 'New Check-In Summary'}
        </Heading>
        <Text style={{ fontSize: '15px', color: '#444' }}>
          Here's the latest update for {seniorName}.
        </Text>
        <Section style={{ backgroundColor: '#f2f6ff', padding: '16px', borderRadius: '8px' }}>
          <Text style={{ fontSize: '15px', color: '#1f2937', margin: 0 }}>{summaryText}</Text>
        </Section>
        {audioUrl ? (
          <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
            <Button
              href={audioUrl}
              style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '12px 22px', borderRadius: '8px', fontSize: '15px', textDecoration: 'none' }}
            >
              ▶ Listen to the recording
            </Button>
            <Text style={{ fontSize: '12px', color: '#6b7280' }}>
              This private link expires in 7 days.
            </Text>
          </Section>
        ) : null}
        {checkInsCount ? (
          <Text style={{ fontSize: '13px', color: '#6b7280' }}>
            Based on {checkInsCount} recent check-in{checkInsCount === 1 ? '' : 's'}.
          </Text>
        ) : null}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CheckInSummaryEmail,
  displayName: 'Check-In Summary',
  subject: (data: CheckInSummaryProps) =>
    data?.isDaily ? 'Daily Health Summary' : 'New Check-In Summary',
  previewData: {
    seniorName: 'Shaki',
    summaryText: 'Slept well, took medications, and felt energetic today.',
    checkInsCount: 1,
    isDaily: false,
    audioUrl: 'https://example.com/recording.mp3',
  },
} satisfies TemplateEntry
