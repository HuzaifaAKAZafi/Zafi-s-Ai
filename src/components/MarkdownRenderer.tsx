import React, { useState } from 'react';
import { marked } from 'marked';
import { Copy, Check, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Pre-process markdown to render custom code blocks with interactive copy buttons
  // We can render markdown through marked, but to give code blocks special interactive UI:
  // We split by code fences ```
  const parts = splitByCodeBlocks(content);

  return (
    <div className="markdown-body space-y-3">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={index}
              language={part.language || 'text'}
              code={part.content}
            />
          );
        }

        // Standard markdown chunk
        const html = marked.parse(part.content, { async: false }) as string;
        return (
          <div
            key={index}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </div>
  );
};

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-neutral-950/90 shadow-lg">
      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.03] px-3.5 py-1.5 text-xs">
        <div className="flex items-center space-x-2 text-slate-400">
          <Terminal className="h-3.5 w-3.5 text-cyan-400" />
          <span className="font-mono uppercase tracking-wider text-[11px] font-semibold text-slate-300">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 rounded-md px-2 py-1 text-[11px] text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-xs font-mono text-cyan-100/90 selection:bg-cyan-500/30">
        <pre className="!m-0 !p-0">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

// Helper to cleanly separate code blocks while preserving remaining markdown
function splitByCodeBlocks(text: string): Array<{ type: 'markdown' | 'code'; language?: string; content: string }> {
  const result: Array<{ type: 'markdown' | 'code'; language?: string; content: string }> = [];
  const regex = /```([a-zA-Z0-9_\-+.]*)\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({
        type: 'markdown',
        content: text.slice(lastIndex, match.index),
      });
    }

    result.push({
      type: 'code',
      language: match[1] || 'plaintext',
      content: match[2],
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    result.push({
      type: 'markdown',
      content: text.slice(lastIndex),
    });
  }

  return result.length > 0 ? result : [{ type: 'markdown', content: text }];
}
