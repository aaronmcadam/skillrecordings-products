import {Inngest, EventSchemas} from 'inngest'

import {
  type LLMSuggestionsCreated,
  type NewTipVideo,
  type SRTReadyEvent,
  type TranscriptCreatedEvent,
  type EmailWritingRequested,
  EMAIL_WRITING_REQUESTED_EVENT,
  EMAIL_WRITING_REQUEST_COMPLETED_EVENT,
  TIP_VIDEO_LLM_SUGGESTIONS_CREATED_EVENT,
  TIP_VIDEO_SRT_READY_EVENT,
  TIP_VIDEO_TRANSCRIPT_CREATED_EVENT,
  TIP_VIDEO_UPLOADED_EVENT,
  EmailWritingRequestCompleted,
} from 'inngest/events'
import {
  STRIPE_CHECKOUT_COMPLETED_EVENT,
  StripeCheckoutCompleted,
} from '@skillrecordings/inngest'
import {
  LESSON_COMPLETED_EVENT,
  type LessonCompleted,
} from '@skillrecordings/skill-lesson/inngest/events'

export type IngestEvents = {
  [TIP_VIDEO_UPLOADED_EVENT]: NewTipVideo
  [TIP_VIDEO_TRANSCRIPT_CREATED_EVENT]: TranscriptCreatedEvent
  [TIP_VIDEO_SRT_READY_EVENT]: SRTReadyEvent
  [TIP_VIDEO_LLM_SUGGESTIONS_CREATED_EVENT]: LLMSuggestionsCreated
  [STRIPE_CHECKOUT_COMPLETED_EVENT]: StripeCheckoutCompleted
  [LESSON_COMPLETED_EVENT]: LessonCompleted
  [EMAIL_WRITING_REQUESTED_EVENT]: EmailWritingRequested
  [EMAIL_WRITING_REQUEST_COMPLETED_EVENT]: EmailWritingRequestCompleted
}
export const inngest = new Inngest({
  id: process.env.INNGEST_APP_NAME || process.env.NEXT_PUBLIC_SITE_TITLE,
  schemas: new EventSchemas().fromRecord<IngestEvents>(),
})
