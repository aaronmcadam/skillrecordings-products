import {sanityClient} from '@skillrecordings/skill-lesson/utils/sanity-client'
import groq from 'groq'

export const getLesson = async (
  slug: string,
  includeMedia: boolean = true,
): Promise<any> => {
  const exercise = await sanityClient.fetch(
    `*[_type in ['explainer'] && slug.current == $slug][0]{
      _id,
      _type,
      _updatedAt,
      title,
      description,
      "slug": slug.current,
      body,
      "section": *[_type in ['section'] && references(^._id)][0]{
        _id,
        "slug": slug.current,
        title
      },
      "stackblitz": resources[@._type == 'stackblitz'][0].openFile,
      ...resources[@->._type == 'videoResource'][0]-> {
        "videoResourceId": _id,
        "durationInSeconds": duration,
        "transcript": castingwords.transcript
      },
      "solution": resources[@._type == 'solution'][0]{
        _key,
        _type,
        "_updatedAt": ^._updatedAt,
        title,
        description,
        body,
        "videoResourceId": resources[@->._type == 'videoResource'][0]->_id,
        "transcript": resources[@->._type == 'videoResource'][0]-> castingwords.transcript,
        "slug": slug.current,
      }
    } | {
      ...,
      "module": *[_type in ['module'] && references(^.section._id)][0] {
        _id,
        slug,
        title
      }
    }`,
    {slug},
  )

  return exercise
}

export const getAllLessons = async (): Promise<any[]> => {
  const lessons = await sanityClient.fetch(groq`*[_type in ['explainer']]{
      _id,
      _type,
      _updatedAt,
      title,
      description,
      body,
      "slug": slug.current,
      "stackblitz": resources[@._type == 'stackblitz'][0].openFile,
      ...resources[@->._type == 'videoResource'][0]-> {
        "videoResourceId": _id,
        "durationInSeconds": duration
      },
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

  return lessons
}
