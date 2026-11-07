import React, { useState, useMemo } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Key,
  Search,
  X,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Sliders,
  Settings,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { Conversation, ProviderConfigs, ServerProviderStatusResponse } from '../types/chat';
import { PROVIDERS, getProvider } from '../data/providers';
import { isProviderReady } from '../utils/storage';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  configs: ProviderConfigs;
  serverStatus: ServerProviderStatusResponse | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isOpen,
  onClose,
  onOpenSettings,
  configs,
  serverStatus,
}) => {
  const [search, setSearch] = useState('');

  // Count active providers
  const readyProvidersCount = useMemo(() => {
    return PROVIDERS.filter((p) => isProviderReady(p.id, configs, serverStatus)).length;
  }, [configs, serverStatus]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  // Group by date
  const groups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const todayItems: Conversation[] = [];
    const yesterdayItems: Conversation[] = [];
    const last7DaysItems: Conversation[] = [];
    const olderItems: Conversation[] = [];

    filteredConversations.forEach((c) => {
      const date = new Date(c.updatedAt || c.createdAt);
      if (date >= today) {
        todayItems.push(c);
      } else if (date >= yesterday) {
        yesterdayItems.push(c);
      } else if (date >= lastWeek) {
        last7DaysItems.push(c);
      } else {
        olderItems.push(c);
      }
    });

    return [
      { label: 'Today', items: todayItems },
      { label: 'Yesterday', items: yesterdayItems },
      { label: 'Previous 7 Days', items: last7DaysItems },
      { label: 'Older', items: olderItems },
    ].filter((g) => g.items.length > 0);
  }, [filteredConversations]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-black/95 backdrop-blur-2xl transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center space-x-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden border border-amber-500/30 shadow-md shadow-amber-500/20 bg-black">
              <img
                src="/assets/aistudio/IMG-20261107-WA4628_28c72ae7.jpg"
                alt="Zafi's AI Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                Zafi's AI
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1 py-0.2 rounded">
                  Studio
                </span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="group flex w-full items-center justify-center space-x-2 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-indigo-500/15 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/10 transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-500/25 hover:shadow-cyan-500/20 active:scale-[0.99]"
          >
            <Plus className="h-4 w-4 text-cyan-400 group-hover:rotate-90 transition-transform" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Conversations */}
        {conversations.length > 2 && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search history..."
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-1.5 pl-8 pr-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
          {conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-500">
              No previous chats yet.<br />Start asking a question!
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {group.label}
                </div>
                {group.items.map((conv) => {
                  const isActive = conv.id === activeId;
                  const provider = getProvider(conv.provider);

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        onSelectConversation(conv.id);
                        onClose();
                      }}
                      className={`group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-white/10 text-white font-semibold border border-white/15 shadow-sm'
                          : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate pr-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: provider.accentColor }}
                        />
                        <span className="truncate">{conv.title || 'Untitled Chat'}</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity rounded"
                        title="Delete Chat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Bottom Provider Status & Settings */}
        <div className="border-t border-white/10 p-3 bg-white/[0.01]">
          <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span>Ready Engines</span>
            <span className="font-mono text-cyan-400 font-semibold">
              {readyProvidersCount} / {PROVIDERS.length} Active
            </span>
          </div>

          <PWAInstallButton />

          <button
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:border-white/20 transition-all"
          >
            <div className="flex items-center space-x-2">
              <Key className="h-4 w-4 text-cyan-400" />
              <span>Provider API Keys</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </aside>
    </>
  );
};
