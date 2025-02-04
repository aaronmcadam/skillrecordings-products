import {sanityClient} from '@skillrecordings/skill-lesson/utils/sanity-client'
import groq from 'groq'
import z from 'zod'

export const ArticleSchema = z.object({
  title: z.string(),
  metaTitle: z.string().optional(),
  subtitle: z.string().optional(),
  slug: z.string(),
  summary: z.string().optional(),
  description: z.nullable(z.string()).optional(),
  body: z.string(),
  date: z.string(),
  related: z
    .object({
      title: z.string(),
      subtitle: z.string(),
      slug: z.string(),
    })
    .array(),
  ogImage: z.object({
    url: z.string(),
  }),
  state: z.enum(['published', 'draft']),
})

export type Article = z.infer<typeof ArticleSchema>

export async function getAllArticles() {
  return await sanityClient.fetch(groq`*[_type == "article"] | order(date desc){
    _updatedAt,
    title,
    subtitle,
    'slug': slug.current,
    summary,
    body,
    state,
    image,
    date,
}`)
}

export async function getArticle(slug: string) {
  return await sanityClient.fetch(
    groq`*[_type == "article" && slug.current == $slug][0]{
    title,
    subtitle,
    "slug": slug.current,
    body,
    metaTitle,
    date,
    description,
    related[]->{
      title,
      subtitle,
      'slug': slug.current
    },
    ogImage{
      url
    },
    }`,
    {
      slug,
    },
  )
}
