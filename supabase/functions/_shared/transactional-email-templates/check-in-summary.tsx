import * as React from 'npm:react@18.3.1'
import {
  Body,
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
}

export const CheckInSummaryEmail = ({
  seniorName = 'your loved one',
  summaryText = 'No summary available.',
  checkInsCount,
  isDaily = false,
}: CheckInSummaryProps) => (
  <Html>
    <Head />
    <Preview>{isDaily ? 'Daily health summary' : 'New check-in summary'}</Preview>
    <Body style={{ backgroundColor: '#f6f7f9', fontFamily: 'Helvetica, Arial, sans-serif' }}>
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
        {checkInsCount ? (
          <Text style={{ fontSize: '13px', color: '#6b7280' }}>
            Based on {checkInsCount} recent check-in{checkInsCount === 1 ? '' : 's'}.
          </Text>
        ) : null}
        <Text style={{ fontSize: '13px', color: '#6b7280' }}>
          You can listen to the full audio summary in the Cheq-In app.
        </Text>
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
  },
} satisfies TemplateEntry
