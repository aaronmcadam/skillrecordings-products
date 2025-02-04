import {publicProcedure, router} from '@skillrecordings/skill-lesson'
import {z} from 'zod'
import {getExercise} from '../../lib/exercises'

export const lessonResourcesRouter = router({
  byExerciseSlug: publicProcedure
    .input(
      z.object({
        type: z.string(),
        slug: z.string(),
      }),
    )
    .query(async ({ctx, input}) => {
      const lesson = await getExercise(input.slug)
      const sandpack = lesson?.sandpack
      const figma =
        input.type === 'exercise' || input.type === 'explainer'
          ? lesson.figma
          : null
      const github =
        input.type === 'exercise'
          ? lesson.github
          : input.type === 'explainer'
          ? lesson.github
          : lesson.solution?.github
      const gitpod =
        input.type === 'exercise'
          ? lesson.gitpod
          : input.type === 'explainer'
          ? lesson.gitpod
          : lesson.solution?.gitpod

      return {sandpack, figma, github, gitpod}
    }),
})
