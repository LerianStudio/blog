import { useState, useEffect } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export default function MarkdownPreview({ content, className = "" }: MarkdownPreviewProps) {
  const [html, setHtml] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const processMarkdown = async () => {
      if (!content.trim()) {
        setHtml('');
        return;
      }

      setIsProcessing(true);
      try {
        const result = await unified()
          .use(remarkParse)
          .use(remarkGfm)
          .use(remarkRehype)
          .use(rehypeHighlight)
          .use(rehypeStringify)
          .process(content);

        setHtml(String(result));
      } catch (error) {
        console.error('Error processing markdown:', error);
        setHtml(`<p class="text-red-600">Error processing markdown: ${error}</p>`);
      } finally {
        setIsProcessing(false);
      }
    };

    const debounceTimer = setTimeout(processMarkdown, 300);
    return () => clearTimeout(debounceTimer);
  }, [content]);

  if (isProcessing) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-github-blue"></div>
      </div>
    );
  }

  return (
    <div 
      className={`prose prose-gray max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        '--tw-prose-body': '#24292e',
        '--tw-prose-headings': '#24292e',
        '--tw-prose-lead': '#6a737d',
        '--tw-prose-links': '#0366d6',
        '--tw-prose-bold': '#24292e',
        '--tw-prose-counters': '#6a737d',
        '--tw-prose-bullets': '#d1d5da',
        '--tw-prose-hr': '#e1e4e8',
        '--tw-prose-quotes': '#6a737d',
        '--tw-prose-quote-borders': '#dfe2e5',
        '--tw-prose-captions': '#6a737d',
        '--tw-prose-code': '#24292e',
        '--tw-prose-pre-code': '#24292e',
        '--tw-prose-pre-bg': '#f6f8fa',
        '--tw-prose-th-borders': '#d1d5da',
        '--tw-prose-td-borders': '#d1d5da',
      } as React.CSSProperties}
    />
  );
}