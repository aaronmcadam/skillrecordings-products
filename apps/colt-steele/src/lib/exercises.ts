import {sanityClient} from '@skillrecordings/skill-lesson/utils/sanity-client'
import groq from 'groq'
import z from 'zod'
import {ResourceSchema} from '@skillrecordings/skill-lesson/schemas/resource'

export const ExerciseSchema = z
  .object({
    _id: z.string().optional(),
    _key: z.string().optional(),
    github: z
      .nullable(
        z.object({
          repo: z.string(),
        }),
      )
      .optional(),
    videoResourceId: z.nullable(z.string()).optional(),
    transcript: z.nullable(z.any().array()).or(z.string()).optional(),
    sandpack: z
      .nullable(
        z.object({
          files: z.any().array(),
        }),
      )
      .optional(),
    solution: z.nullable(
      z
        .object({
          _type: z.string(),
          _key: z.string(),
          github: z
            .nullable(
              z.object({
                repo: z.string(),
              }),
            )
            .optional(),
          videoResourceId: z.nullable(z.string()).optional(),
          transcript: z.nullable(z.any().array().or(z.string())).optional(),
        })
        .merge(ResourceSchema)
        .optional(),
    ),
  })
  .merge(ResourceSchema)

export type Exercise = z.infer<typeof ExerciseSchema>

export const getExerciseMuxPlaybackId = async (exerciseSlug: string) => {
  const exerciseVideo = await sanityClient.fetch(
    `
  *[_type == "exercise" && slug.current == $slug][0]
    .resources[@->._type == 'videoResource'][0]-> muxAsset.muxPlaybackId`,
    {slug: `${exerciseSlug}`},
  )

  return z.string().nullish().parse(exerciseVideo)
}

export const getExerciseMedia = async (exerciseSlug: string) => {
  const exerciseMedia = await sanityClient.fetch(
    groq`*[_type in ['exercise', 'explainer', 'interview', 'lesson'] && slug.current == $slug][0]{
      "slug": slug.current,
      body,
      "stackblitz": resources[@._type == 'stackblitz'][0].openFile,
      "sandpack": resources[@._type == 'sandpack'][0],
      "muxPlaybackId": resources[@->._type == 'videoResource'][0]-> muxAsset.muxPlaybackId,
      "transcript": resources[@->._type == 'videoResource'][0]-> castingwords.transcript,
      "github": resources[@._type == 'githubRepo'][0],
      "solution": resources[@._type == 'solution'][0]{
        body,
        "stackblitz": resources[@._type == 'stackblitz'][0].openFile,
        "github": resources[@._type == 'githubRepo'][0],
        "muxPlaybackId": resources[@->._type == 'videoResource'][0]-> muxAsset.muxPlaybackId,
        "transcript": resources[@->._type == 'videoResource'][0]-> castingwords.transcript,
        "slug": slug.current,
      }
    }`,
    {slug: `${exerciseSlug}`},
  )

  return exerciseMedia
}

export const getExercise = async (
  slug: string,
  includeMedia: boolean = true,
): Promise<Exercise> => {
  const exercise = await sanityClient.fetch(
    `*[_type in ['exercise', 'explainer', 'interview', 'lesson'] && slug.current == $slug][0]{
      _id,
      _type,
      _updatedAt,
      title,
      description,
      "slug": slug.current,
      body,
      "github": resources[@._type == 'githubRepo'][0],
      "videoResourceId": resources[@->._type == 'videoResource'][0]->_id,
      "transcript": resources[@->._type == 'videoResource'][0]-> castingwords.transcript,
      "sandpack": resources[@._type == 'sandpack'][0],
      "solution": resources[@._type == 'solution'][0]{
        _key,
        _type,
        "_updatedAt": ^._updatedAt,
        title,
        description,
        body,
        "stackblitz": resources[@._type == 'stackblitz'][0].openFile,
        "videoResourceId": resources[@->._type == 'videoResource'][0]->_id,
        "transcript": resources[@->._type == 'videoResource'][0]-> castingwords.transcript,
        "github": resources[@._type == 'githubRepo'][0],
        "slug": slug.current,
      }
    }`,
    {slug},
  )

  return ExerciseSchema.parse(exercise)
}

export const getAllExercises = async (): Promise<Exercise[]> => {
  const lessons =
    await sanityClient.fetch(groq`*[_type in ['exercise', 'explainer', 'interview', 'lesson']]{
      _id,
      _type,
      _updatedAt,
      title,
      description,
      body,
      "slug": slug.current,
      "stackblitz": resources[@._type == 'stackblitz'][0].openFile,
      "videoResourceId": resources[@->._type == 'videoResource'][0],
      "solution": resources[@._type == 'solution'][0]{
        _key,
        _type,
        _updatedAt,
        title,
        description,
        body,
        "stackblitz": resources[@._type == 'stackblitz'][0].openFile,
        "videoResourceId": resources[@->._type == 'videoResource'][0],
       "slug": slug.current
       }
    }`)

  return z.array(ExerciseSchema).parse(lessons)
}
