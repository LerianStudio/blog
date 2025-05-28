import { defineType, defineArrayMember } from 'sanity'

/**
 * This is the schema definition for the rich text fields used for
 * for this blog studio. When you import it in schemas.js it can be
 * reused in other parts of the studio with:
 *  {
 *    name: 'someName',
 *    title: 'Some title',
 *    type: 'blockContent'
 *  }
 */
export default defineType({
  title: 'Block Content',
  name: 'blockContent',
  type: 'array',
  of: [
    defineArrayMember({
      title: 'Block',
      type: 'block',
      // Styles let you set what your user can mark up blocks with. These
      // correspond with HTML tags, but you can set any title or value
      // you want and decide how you want to deal with it where you want to
      // use your content.
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'H1', value: 'h1' },
        { title: 'H2', value: 'h2' },
        { title: 'H3', value: 'h3' },
        { title: 'H4', value: 'h4' },
        { title: 'Quote', value: 'blockquote' },
      ],
      lists: [
        { title: 'Bullet', value: 'bullet' },
        { title: 'Numbered', value: 'number' },
      ],
      // Marks let you mark up inline text in the block editor.
      marks: {
        // Decorators usually describe a single property – e.g. a typographic
        // preference or highlighting by editors.
        decorators: [
          { title: 'Strong', value: 'strong' },
          { title: 'Emphasis', value: 'em' },
          { title: 'Code', value: 'code' },
          { title: 'Underline', value: 'underline' },
          { title: 'Strike', value: 'strike-through' },
        ],
        // Annotations can be any object structure – e.g. a link or a footnote.
        annotations: [
          {
            title: 'URL',
            name: 'link',
            type: 'object',
            fields: [
              {
                title: 'URL',
                name: 'href',
                type: 'url',
              },
              {
                title: 'Open in new tab',
                name: 'blank',
                type: 'boolean',
                initialValue: true,
              },
            ],
          },
        ],
      },
    }),
    // You can add additional types here. Note that you can't use
    // primitive types such as 'string' and 'number' in the same array
    // as a block type.
    defineArrayMember({
      type: 'image',
      name: 'inlineImage',
      title: 'Inline Image',
      options: { hotspot: true },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative Text',
          description: 'Important for accessibility and SEO',
        },
        {
          name: 'caption',
          type: 'string',
          title: 'Caption',
        },
      ],
    }),
    // Code block for technical content
    defineArrayMember({
      type: 'object',
      name: 'codeBlock',
      title: 'Code Block',
      fields: [
        {
          name: 'language',
          title: 'Language',
          type: 'string',
          options: {
            list: [
              { title: 'Go', value: 'go' },
              { title: 'TypeScript', value: 'typescript' },
              { title: 'JavaScript', value: 'javascript' },
              { title: 'Python', value: 'python' },
              { title: 'Rust', value: 'rust' },
              { title: 'SQL', value: 'sql' },
              { title: 'Shell', value: 'bash' },
              { title: 'YAML', value: 'yaml' },
              { title: 'JSON', value: 'json' },
              { title: 'HTML', value: 'html' },
              { title: 'CSS', value: 'css' },
              { title: 'Dockerfile', value: 'dockerfile' },
              { title: 'Plain Text', value: 'text' },
            ],
          },
          initialValue: 'go',
        },
        {
          name: 'code',
          title: 'Code',
          type: 'text',
          rows: 10,
        },
        {
          name: 'filename',
          title: 'Filename (optional)',
          type: 'string',
          description: 'e.g. main.go, package.json',
        },
        {
          name: 'highlightLines',
          title: 'Highlight Lines (optional)',
          type: 'string',
          description: 'e.g. 1,3-5,7 to highlight lines 1, 3 through 5, and 7',
        },
      ],
      preview: {
        select: {
          language: 'language',
          filename: 'filename',
          code: 'code',
        },
        prepare({ language, filename, code }) {
          const truncatedCode = code ? code.substring(0, 100) + '...' : ''
          return {
            title: filename || `${language || 'Code'} snippet`,
            subtitle: truncatedCode,
            media: () => '💻',
          }
        },
      },
    }),
    // Callout/Alert blocks for technical content
    defineArrayMember({
      type: 'object',
      name: 'callout',
      title: 'Callout',
      fields: [
        {
          name: 'type',
          title: 'Type',
          type: 'string',
          options: {
            list: [
              { title: '💡 Info', value: 'info' },
              { title: '⚠️ Warning', value: 'warning' },
              { title: '❌ Error', value: 'error' },
              { title: '✅ Success', value: 'success' },
              { title: '📝 Note', value: 'note' },
              { title: '🚀 Tip', value: 'tip' },
            ],
          },
          initialValue: 'info',
        },
        {
          name: 'title',
          title: 'Title (optional)',
          type: 'string',
        },
        {
          name: 'content',
          title: 'Content',
          type: 'text',
          rows: 3,
        },
      ],
      preview: {
        select: {
          type: 'type',
          title: 'title',
          content: 'content',
        },
        prepare({ type, title, content }) {
          const typeMap: Record<string, string> = {
            info: '💡 Info',
            warning: '⚠️ Warning',
            error: '❌ Error',
            success: '✅ Success',
            note: '📝 Note',
            tip: '🚀 Tip',
          }
          return {
            title: title || typeMap[type] || 'Callout',
            subtitle: content ? content.substring(0, 80) + '...' : '',
          }
        },
      },
    }),
  ],
})
