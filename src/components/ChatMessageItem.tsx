import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  User,
  AlertCircle,
  ExternalLink,
  Key,
} from 'lucide-react';
import { ChatMessage, ProviderId } from '../types/chat';
import { getProvider, getModel } from '../data/providers';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ThinkingProcess } from './ThinkingProcess';

interface ChatMessageItemProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onOpenSettings?: (providerId: ProviderId) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onRegenerate,
  onOpenSettings,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const provider = getProvider(message.provider);
  const model = getModel(message.provider, message.model);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end my-4 animate-in fade-in duration-150">
        <div className="flex max-w-[85%] sm:max-w-[75%] items-start space-x-2.5">
          <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-cyan-600 to-blue-600 px-4 py-3 text-sm text-white shadow-lg shadow-cyan-900/20 leading-relaxed break-words whitespace-pre-wrap">
            {message.content}
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300">
            <User className="h-4 w-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start my-4 w-full animate-in fade-in duration-150">
      <div className="flex w-full items-start space-x-3 max-w-4xl">
        {/* Provider Icon Avatar */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-md mt-0.5"
          style={{ backgroundColor: provider.accentColor }}
        >
          {provider.name.charAt(0)}
        </div>

        {/* Message Card */}
        <div className="flex-1 overflow-hidden rounded-2xl rounded-tl-sm border border-white/10 bg-neutral-900/50 p-4 backdrop-blur-xl shadow-xl">
          {/* Header Info */}
          <div className="mb-2 flex items-center justify-between border-b border-white/5 pb-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white">{provider.name}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 font-mono text-[11px]">{model.name}</span>
              {model.isFree ? (
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                  {model.tierLabel}
                </span>
              ) : (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-semibold text-amber-400 border border-amber-500/30">
                  {model.tierLabel}
                </span>
              )}
            </div>

            {/* Actions Toolbar */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1 rounded-md px-2 py-1 text-[11px] text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Copy response"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {onRegenerate && !message.streaming && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center space-x-1 rounded-md px-2 py-1 text-[11px] text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                  title="Regenerate response"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          </div>

          {/* Thinking / Reasoning Chain (if available) */}
          {message.thinking && (
            <ThinkingProcess thinking={message.thinking} isStreaming={message.streaming} />
          )}

          {/* Error Message with Setup Callout */}
          {message.error ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-950/25 p-3.5 text-xs text-rose-200">
              <div className="flex items-start space-x-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="font-semibold text-rose-300">
                    Failed to receive response from {provider.name}:
                  </div>
                  <div className="text-rose-200/90 leading-relaxed font-mono text-[11px] bg-black/30 p-2 rounded-lg">
                    {message.error}
                  </div>
                  {onOpenSettings && (
                    <button
                      onClick={() => onOpenSettings(message.provider)}
                      className="mt-2 inline-flex items-center space-x-1.5 rounded-lg border border-rose-500/30 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 transition-colors"
                    >
                      <Key className="h-3.5 w-3.5" />
                      <span>Configure {provider.name} API Key</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Formatted Content */
            <div>
              {message.content ? (
                <MarkdownRenderer content={message.content} />
              ) : message.streaming ? (
                <div className="flex items-center space-x-2 py-1 text-xs text-slate-400">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  <span>Generating response...</span>
                </div>
              ) : null}

              {message.streaming && message.content && (
                <span className="streaming-cursor" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
