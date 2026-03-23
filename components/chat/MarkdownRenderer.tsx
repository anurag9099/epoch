"use client";
import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

// Configure marked
marked.setOptions({ gfm: true, breaks: true });

// Custom renderer for code blocks
const renderer = new marked.Renderer();

// Override code block rendering
renderer.code = function({ text, lang }) {
  const language = lang || "text";
  // Return HTML with our custom code block structure
  return `<div class="unity-code-block" data-lang="${language}">
    <div class="unity-code-header">
      <span class="unity-code-lang">${language}</span>
      <div class="unity-code-actions">
        <button class="unity-copy-btn" data-code="${encodeURIComponent(text)}">Copy</button>
      </div>
    </div>
    <pre class="unity-code-body"><code>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
  </div>`;
};

// Override inline code
renderer.codespan = function({ text }) {
  return `<code class="unity-inline-code">${text}</code>`;
};

// Ensure links open in new tab with proper styling
renderer.link = function({ href, title, text }) {
  const titleAttr = title ? ` title="${title}"` : "";
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer" class="unity-link">${text}</a>`;
};

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const html = useMemo(() => {
    // Pre-process: linkify bare URLs not already in markdown link syntax
    const linkified = content.replace(
      /(?<!\]\()(?<!\()(https?:\/\/[^\s)<>]+)/g,
      (url) => `<${url}>`
    );
    const raw = marked.parse(linkified, { renderer }) as string;
    // Sanitize but allow our custom classes
    return DOMPurify.sanitize(raw, {
      ADD_ATTR: ['data-lang', 'data-code', 'class', 'target', 'rel'],
      ADD_TAGS: ['button'],
    });
  }, [content]);

  // Handle copy button clicks via event delegation
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('unity-copy-btn')) {
      const code = decodeURIComponent(target.getAttribute('data-code') || '');
      navigator.clipboard.writeText(code);
      target.textContent = 'Copied!';
      setTimeout(() => { target.textContent = 'Copy'; }, 1500);
    }
  };

  return (
    <div
      className="unity-markdown"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
