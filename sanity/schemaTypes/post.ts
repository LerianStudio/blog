import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
        slugify: (input) =>
          input
            .toLowerCase()
            .replace(/[àáäâã]/g, 'a')
            .replace(/[éèëê]/g, 'e')
            .replace(/[íìïî]/g, 'i')
            .replace(/[óòöôõ]/g, 'o')
            .replace(/[úùüû]/g, 'u')
            .replace(/[ç]/g, 'c')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, ''),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Publication Date',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'draft',
      title: 'Draft',
      type: 'boolean',
      initialValue: true,
      description: 'Set to false to publish the post',
    }),
    defineField({
      name: 'featured_image',
      title: 'Featured Image',
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          title: 'Alternative Text',
          type: 'string',
          description: 'Important for accessibility and SEO',
        },
        {
          name: 'caption',
          title: 'Caption',
          type: 'string',
          description: 'Optional caption for the image',
        },
      ],
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [
        {
          type: 'string',
          options: {
            list: [
              { title: 'Development', value: 'Development' },
              { title: 'API Design', value: 'API Design' },
              { title: 'Architecture', value: 'Architecture' },
              { title: 'Financial Technology', value: 'Financial Technology' },
              { title: 'Product', value: 'Product' },
              { title: 'Data Security', value: 'Data Security' },
            ],
          },
        },
      ],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'series',
      title: 'Series',
      type: 'string',
      description: 'If this post is part of a series',
    }),
    defineField({
      name: 'body',
      title: 'Content',
      type: 'blockContent',
    }),
  ],

  preview: {
    select: {
      title: 'title',
      date: 'date',
      media: 'featured_image',
      draft: 'draft',
    },
    prepare(selection) {
      const { title, date, draft } = selection
      const formattedDate = date ? new Date(date).toLocaleDateString() : ''
      const status = draft ? '🚧 Draft' : '✅ Published'

      return {
        title,
        subtitle: `${status} • ${formattedDate}`,
        media: selection.media,
      }
    },
  },

  orderings: [
    {
      title: 'Date, New',
      name: 'dateDesc',
      by: [{ field: 'date', direction: 'desc' }],
    },
    {
      title: 'Date, Old',
      name: 'dateAsc',
      by: [{ field: 'date', direction: 'asc' }],
    },
  ],
})
