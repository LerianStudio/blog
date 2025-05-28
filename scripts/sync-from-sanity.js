#!/usr/bin/env node

/**
 * Sync content from Sanity to Hugo markdown files
 * This script fetches published posts from Sanity and converts them to Hugo-compatible markdown
 */

import { createClient } from '@sanity/client'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Sanity client configuration
const client = createClient({
    projectId: 'ouf5coh1', // Your project ID from sanity.config.ts
    dataset: 'production',
    useCdn: false, // Use CDN for faster response times in production
    apiVersion: '2023-05-03', // Use current date (YYYY-MM-DD) to target the latest API version
})

// GROQ query to fetch published posts
const query = `*[_type == "post" && !draft] | order(date desc) {
  title,
  slug,
  date,
  draft,
  featured_image,
  categories,
  tags,
  series,
  body,
  _id,
  _updatedAt
}`

/**
 * Convert Sanity block content to markdown
 */
function blockContentToMarkdown(blocks) {
    if (!blocks || !Array.isArray(blocks)) return ''

    return blocks.map(block => {
        switch (block._type) {
            case 'block':
                return blockToMarkdown(block)
            case 'inlineImage':
                return imageToMarkdown(block)
            case 'codeBlock':
                return codeBlockToMarkdown(block)
            case 'callout':
                return calloutToMarkdown(block)
            default:
                return ''
        }
    }).join('\n\n')
}

function blockToMarkdown(block) {
    const { style = 'normal', children = [] } = block

    const text = children.map(child => {
        let text = child.text || ''

        // Apply marks
        if (child.marks) {
            child.marks.forEach(mark => {
                switch (mark) {
                    case 'strong':
                        text = `**${text}**`
                        break
                    case 'em':
                        text = `*${text}*`
                        break
                    case 'code':
                        text = `\`${text}\``
                        break
                    case 'underline':
                        text = `<u>${text}</u>`
                        break
                    case 'strike-through':
                        text = `~~${text}~~`
                        break
                }
            })
        }

        return text
    }).join('')

    // Apply block styles
    switch (style) {
        case 'h1':
            return `# ${text}`
        case 'h2':
            return `## ${text}`
        case 'h3':
            return `### ${text}`
        case 'h4':
            return `#### ${text}`
        case 'blockquote':
            return `> ${text}`
        default:
            return text
    }
}

function imageToMarkdown(image) {
    const alt = image.alt || ''
    const caption = image.caption || ''
    // Note: You'll need to handle image URLs based on your Sanity setup
    return `![${alt}](${image.asset?.url || ''})\n${caption ? `*${caption}*` : ''}`
}

function codeBlockToMarkdown(codeBlock) {
    const { language = '', code = '', filename = '' } = codeBlock
    const filenameComment = filename ? `// ${filename}\n` : ''
    return `\`\`\`${language}\n${filenameComment}${code}\n\`\`\``
}

function calloutToMarkdown(callout) {
    const { type = 'info', title = '', content = '' } = callout
    const emoji = {
        info: '💡',
        warning: '⚠️',
        error: '❌',
        success: '✅',
        note: '📝',
        tip: '🚀'
    }[type] || '💡'

    const titleText = title ? `**${emoji} ${title}**\n\n` : `**${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}**\n\n`
    return `> ${titleText}${content}`
}

/**
 * Generate Hugo frontmatter
 */
function generateFrontmatter(post) {
    const frontmatter = {
        title: post.title,
        date: post.date,
        draft: post.draft || false,
        slug: post.slug?.current || '',
    }

    if (post.featured_image) {
        frontmatter.featured_image = post.featured_image.asset?.url || ''
        if (post.featured_image.alt) {
            frontmatter.featured_image_alt = post.featured_image.alt
        }
        if (post.featured_image.caption) {
            frontmatter.featured_image_caption = post.featured_image.caption
        }
    }

    if (post.categories?.length) {
        frontmatter.categories = post.categories
    }

    if (post.tags?.length) {
        frontmatter.tags = post.tags
    }

    if (post.series) {
        frontmatter.series = post.series
    }

    // Convert to TOML format (Hugo's preferred frontmatter format)
    const tomlLines = ['+++']

    Object.entries(frontmatter).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            tomlLines.push(`${key} = [${value.map(v => `'${v}'`).join(', ')}]`)
        } else if (typeof value === 'boolean') {
            tomlLines.push(`${key} = ${value}`)
        } else {
            tomlLines.push(`${key} = '${value}'`)
        }
    })

    tomlLines.push('+++')
    return tomlLines.join('\n')
}

/**
 * Main sync function
 */
async function syncFromSanity() {
    try {
        console.log('🚀 Fetching posts from Sanity...')
        const posts = await client.fetch(query)

        console.log(`📝 Found ${posts.length} published posts`)

        const contentDir = path.join(__dirname, '..', 'content', 'posts')

        // Ensure content directory exists
        await fs.mkdir(contentDir, { recursive: true })

        for (const post of posts) {
            const filename = `${post.slug?.current || post._id}.md`
            const filepath = path.join(contentDir, filename)

            const frontmatter = generateFrontmatter(post)
            const content = blockContentToMarkdown(post.body)

            const markdown = `${frontmatter}\n\n${content}`

            await fs.writeFile(filepath, markdown, 'utf8')
            console.log(`✅ Synced: ${filename}`)
        }

        console.log('🎉 Sync completed successfully!')

    } catch (error) {
        console.error('❌ Sync failed:', error)
        process.exit(1)
    }
}

// Run the sync
syncFromSanity() 