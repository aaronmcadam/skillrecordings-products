import React from 'react'
import ExerciseTemplate from 'templates/exercise-template'
import {GetStaticPaths, GetStaticProps} from 'next'
import {getExercise} from 'lib/exercises'
import {LessonProvider} from '@skillrecordings/skill-lesson/hooks/use-lesson'
import {VideoResourceProvider} from '@skillrecordings/skill-lesson/hooks/use-video-resource'
import {getAllWorkshops, getWorkshop} from '../../../../../lib/workshops'
import {getSection} from '@skillrecordings/skill-lesson/lib/sections'
import path from 'path'
import {walk} from '../../../../../utils/code-editor-content'
import {Lesson} from '@skillrecordings/skill-lesson/schemas/lesson'
import {ModuleProgressProvider} from '@skillrecordings/skill-lesson/video/module-progress'
import serializeMDX from '@skillrecordings/skill-lesson/markdown/serialize-mdx'
import truncateMarkdown from 'markdown-truncate'

export const getStaticProps: GetStaticProps = async (context) => {
  const {params} = context
  const lessonSlug = params?.lesson as string
  const sectionSlug = params?.section as string

  const module = await getWorkshop(params?.module as string)
  const section = await getSection(sectionSlug)
  const lesson = await getExercise(lessonSlug)
  const solution = lesson.solution
  const lessonBodySerialized =
    typeof solution?.body === 'string' &&
    (await serializeMDX(solution.body, {
      syntaxHighlighterOptions: {
        theme: 'one-dark-pro',
      },
    }))
  const lessonBodyPreviewSerialized =
    typeof solution?.body === 'string' &&
    (await serializeMDX(
      truncateMarkdown(solution.body, {limit: 300, ellipsis: false}),
      {
        syntaxHighlighterOptions: {
          theme: 'dark-plus',
        },
      },
    ))
  const tutorialDirectory = path.join(
    process.cwd(),
    'src/components/sandpack/parcel',
  )
  const tutorialFiles = walk(tutorialDirectory)

  return {
    props: {
      lesson: solution,
      lessonBodySerialized,
      lessonBodyPreviewSerialized,
      section,
      module,
      tutorialFiles,
      transcript: lesson.solution?.transcript || [],
      videoResourceId: lesson.solution?.videoResourceId,
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
          section.lessons
            ?.filter(({_type}: Lesson) => _type === 'exercise')
            .map((lesson: any) => ({
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

const ExerciseSolution: React.FC<any> = ({
  lesson,
  lessonBodySerialized,
  lessonBodyPreviewSerialized,
  section,
  module,
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

export default ExerciseSolution
