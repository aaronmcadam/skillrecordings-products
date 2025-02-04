import React from 'react'
import ExerciseTemplate from '@/templates/exercise-template'
import {GetStaticPaths, GetStaticProps} from 'next'
import {getExercise, getExerciseMedia} from '@/lib/exercises'
import {getAllWorkshops, getWorkshop} from '@/lib/workshops'
import {getSection} from '@/lib/sections'
import {VideoResourceProvider} from '@skillrecordings/skill-lesson/hooks/use-video-resource'
import {LessonProvider} from '@skillrecordings/skill-lesson/hooks/use-lesson'
import {ModuleProgressProvider} from '@skillrecordings/skill-lesson/video/module-progress'
import serializeMDX from '@skillrecordings/skill-lesson/markdown/serialize-mdx'
import truncateMarkdown from 'markdown-truncate'

export const getStaticProps: GetStaticProps = async (context) => {
  const {params} = context
  const lessonSlug = params?.lesson as string
  const sectionSlug = params?.section as string

  const module = await getWorkshop(params?.module as string)
  const section = await getSection(sectionSlug)
  const lesson = await getExercise(lessonSlug, false)
  const lessonBodySerialized =
    typeof lesson.body === 'string' &&
    (await serializeMDX(lesson.body, {
      syntaxHighlighterOptions: {
        theme: 'dark-plus',
        showCopyButton: true,
      },
    }))
  const lessonBodyPreviewSerialized =
    typeof lesson.body === 'string' &&
    (await serializeMDX(
      truncateMarkdown(lesson.body, {limit: 300, ellipsis: false}),
      {
        syntaxHighlighterOptions: {
          theme: 'dark-plus',
        },
      },
    ))

  return {
    props: {
      lesson,
      lessonBodySerialized,
      lessonBodyPreviewSerialized,
      module,
      section,
      transcript: lesson.transcript,
      videoResourceId: lesson.videoResourceId,
    },
    revalidate: 10,
  }
}

export const getStaticPaths: GetStaticPaths = async (context) => {
  const workshops = await getAllWorkshops()

  // flatMap to extract lessons in sections from workshops
  const paths = workshops.flatMap((workshop: any) => {
    return (
      workshop.sections?.flatMap((section: any) => {
        return (
          section.lessons?.map((lesson: any) => ({
            params: {
              module: workshop.slug.current,
              section: section.slug,
              lesson: lesson.slug,
            },
          })) || []
        )
      }) || []
    )
  })

  return {paths, fallback: 'blocking'}
}

const ExercisePage: React.FC<any> = ({
  lesson,
  lessonBodySerialized,
  lessonBodyPreviewSerialized,
  module,
  section,
  transcript,
  videoResourceId,
}) => {
  return (
    <ModuleProgressProvider moduleSlug={module.slug.current}>
      <LessonProvider lesson={lesson} module={module} section={section}>
        <VideoResourceProvider videoResourceId={videoResourceId}>
          <ExerciseTemplate
            transcript={transcript}
            lessonBodySerialized={lessonBodySerialized}
            lessonBodyPreviewSerialized={lessonBodyPreviewSerialized}
          />
        </VideoResourceProvider>
      </LessonProvider>
    </ModuleProgressProvider>
  )
}

export default ExercisePage
