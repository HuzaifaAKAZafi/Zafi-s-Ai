import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Sparkles,
  Send,
  Square,
  Key,
  Sliders,
  RotateCcw,
  Plus,
  Compass,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Gift,
  HelpCircle,
  Cpu,
  Brain,
  Code,
  Layers,
  BarChart3,
} from 'lucide-react';
import {
  ProviderId,
  ChatMessage,
  Conversation,
  ProviderConfigs,
  ServerProviderStatusResponse,
  ModelInfo,
  UsageStats,
} from './types/chat';
import { PROVIDERS, ALL_MODELS, getProvider, getModel } from './data/providers';
import {
  loadConfigs,
  saveConfigs,
  loadConversations,
  saveConversations,
  getActiveConversationId,
  setActiveConversationId,
  isProviderReady,
  loadUsageStats,
  saveUsageStats,
  recordTokenUsage,
  DEFAULT_USAGE_STATS,
} from './utils/storage';
import { Sidebar } from './components/Sidebar';
import { ModelSelector } from './components/ModelSelector';
import { ChatMessageItem } from './components/ChatMessageItem';
import { ProviderSettingsModal } from './components/ProviderSettingsModal';
import { SystemPromptModal } from './components/SystemPromptModal';
import { ModelInfoModal } from './components/ModelInfoModal';
import { UsageDashboardModal } from './components/UsageDashboardModal';

export default function App() {
  // State
  const [configs, setConfigs] = useState<ProviderConfigs>(loadConfigs);
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(getActiveConversationId);
  const [serverStatus, setServerStatus] = useState<ServerProviderStatusResponse | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>(ALL_MODELS);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);

  // Active Provider & Model selection (defaults to Gemini)
  const [currentProvider, setCurrentProvider] = useState<ProviderId>('gemini');
  const [currentModel, setCurrentModel] = useState<string>('gemini-3.1-flash-lite');

  // Input & Streaming State
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modals & Sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialProvider, setSettingsInitialProvider] = useState<ProviderId | undefined>();
  const [systemPromptOpen, setSystemPromptOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [usageDashboardOpen, setUsageDashboardOpen] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats>(loadUsageStats);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load server status & models catalog on mount
  useEffect(() => {
    fetch('/api/providers/status')
      .then((res) => res.json())
      .then((data) => setServerStatus(data))
      .catch((err) => console.warn('Could not fetch provider status:', err));

    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        if (data?.models && Array.isArray(data.models)) {
          setAvailableModels(data.models);
        }
      })
      .catch((err) => console.warn('Could not load models catalog:', err));
  }, []);

  // Force refresh live models from provider APIs
  const handleRefreshModels = async () => {
    setIsRefreshingModels(true);
    try {
      const res = await fetch('/api/models/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientKeys: configs }),
      });
      const data = await res.json();
      if (data?.models && Array.isArray(data.models)) {
        setAvailableModels(data.models);
      }
    } catch (err) {
      console.warn('Failed to refresh models:', err);
    } finally {
      setIsRefreshingModels(false);
    }
  };

  // Sync active conversation
  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // If active conversation changes, sync provider & model if present
  useEffect(() => {
    if (activeConversation) {
      if (activeConversation.provider) setCurrentProvider(activeConversation.provider);
      if (activeConversation.model) setCurrentModel(activeConversation.model);
      if (activeConversation.systemPrompt) setSystemPrompt(activeConversation.systemPrompt);
    }
  }, [activeConvId]);

  // Auto-scroll chat to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    chatBottomRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [activeConversation?.messages]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputPrompt]);

  // Handle Provider & Model change
  const handleSelectModel = (providerId: ProviderId, modelId: string) => {
    setCurrentProvider(providerId);
    setCurrentModel(modelId);

    if (activeConversation) {
      const updated = conversations.map((c) =>
        c.id === activeConversation.id ? { ...c, provider: providerId, model: modelId } : c
      );
      setConversations(updated);
      saveConversations(updated);
    }
  };

  // Create New Chat
  const handleNewChat = () => {
    const newId = `conv_${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      provider: currentProvider,
      model: currentModel,
      systemPrompt: systemPrompt || undefined,
    };
    const updated = [newConv, ...conversations];
    setConversations(updated);
    saveConversations(updated);
    setActiveConvId(newId);
    setActiveConversationId(newId);
    setInputPrompt('');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // Select Conversation
  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setActiveConversationId(id);
  };

  // Delete Conversation
  const handleDeleteConversation = (id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    saveConversations(updated);
    if (activeConvId === id) {
      const nextId = updated.length > 0 ? updated[0].id : null;
      setActiveConvId(nextId);
      setActiveConversationId(nextId);
    }
  };

  // Save Settings
  const handleSaveConfigs = (newConfigs: ProviderConfigs) => {
    setConfigs(newConfigs);
    saveConfigs(newConfigs);
  };

  const handleOpenSettings = (initialProvider?: ProviderId) => {
    setSettingsInitialProvider(initialProvider);
    setSettingsOpen(true);
  };

  // Abort active stream
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Send message
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText ?? inputPrompt.trim();
    if (!textToSend || isStreaming) return;

    // Check if provider is ready
    const ready = isProviderReady(currentProvider, configs, serverStatus);
    if (!ready) {
      handleOpenSettings(currentProvider);
      return;
    }

    let targetConv = activeConversation;
    let convList = [...conversations];

    // If no active conversation, create one
    if (!targetConv) {
      const newId = `conv_${Date.now()}`;
      targetConv = {
        id: newId,
        title: textToSend.slice(0, 36) + (textToSend.length > 36 ? '...' : ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        provider: currentProvider,
        model: currentModel,
        systemPrompt: systemPrompt || undefined,
      };
      convList = [targetConv, ...convList];
      setActiveConvId(newId);
      setActiveConversationId(newId);
    } else if (targetConv.messages.length === 0) {
      // Set title from first prompt
      targetConv.title = textToSend.slice(0, 36) + (textToSend.length > 36 ? '...' : '');
    }

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: textToSend,
      provider: currentProvider,
      model: currentModel,
      timestamp: Date.now(),
    };

    const assistantMessageId = `msg_asst_${Date.now() + 1}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      provider: currentProvider,
      model: currentModel,
      timestamp: Date.now(),
      streaming: true,
    };

    const updatedMessages = [...targetConv.messages, userMessage, assistantMessage];
    targetConv.messages = updatedMessages;
    targetConv.updatedAt = Date.now();

    setConversations(convList);
    saveConversations(convList);
    setInputPrompt('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const providerConfig = configs[currentProvider] || { apiKey: '', temperature: 0.7 };

      // Prepare payload for backend proxy
      const payload = {
        provider: currentProvider,
        model: currentModel,
        messages: targetConv.messages
          .filter((m) => m.id !== assistantMessageId)
          .map((m) => ({
            role: m.role,
            content: m.content,
          })),
        apiKey: providerConfig.apiKey || undefined,
        accountId: providerConfig.accountId || undefined,
        customEndpoint: providerConfig.customEndpoint || undefined,
        temperature: providerConfig.temperature ?? 0.7,
        systemInstruction: systemPrompt || undefined,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response stream not readable');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';
      let accumulatedThinking = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const trimmed = block.trim();
          if (!trimmed) continue;

          // Parse event and data
          const eventMatch = trimmed.match(/^event:\s*(\w+)/m);
          const dataMatch = trimmed.match(/^data:\s*(.+)$/m);

          const eventType = eventMatch ? eventMatch[1] : 'delta';
          const rawData = dataMatch ? dataMatch[1] : '';

          if (eventType === 'error') {
            try {
              const parsed = JSON.parse(rawData);
              assistantMessage.error = parsed.message || 'Provider error';
            } catch {
              assistantMessage.error = rawData || 'Unknown error from provider';
            }
          } else if (eventType === 'thinking') {
            try {
              const parsed = JSON.parse(rawData);
              accumulatedThinking += parsed.text || '';
              assistantMessage.thinking = accumulatedThinking;
            } catch {}
          } else if (eventType === 'delta') {
            try {
              const parsed = JSON.parse(rawData);
              accumulatedContent += parsed.text || '';
              assistantMessage.content = accumulatedContent;
            } catch {}
          } else if (eventType === 'done') {
            assistantMessage.streaming = false;
          }

          // Trigger state update
          setConversations([...convList]);
        }
      }

      assistantMessage.streaming = false;

      // Estimate token usage
      const promptTokensEst = Math.max(1, Math.ceil(textToSend.length / 4));
      const completionTokensEst = Math.max(1, Math.ceil(accumulatedContent.length / 4));
      assistantMessage.usage = {
        promptTokens: promptTokensEst,
        completionTokens: completionTokensEst,
        totalTokens: promptTokensEst + completionTokensEst,
      };

      // Record to Usage Dashboard
      const estCost = currentProvider === 'deepseek' ? (promptTokensEst * 0.00000014 + completionTokensEst * 0.00000028) : 0;
      const updatedUsage = recordTokenUsage(currentProvider, promptTokensEst, completionTokensEst, estCost);
      setUsageStats(updatedUsage);

      targetConv.messages = [...targetConv.messages];
      setConversations([...convList]);
      saveConversations(convList);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        assistantMessage.content += ' [Generation paused]';
      } else {
        assistantMessage.error = err.message || 'Connection error';
      }
      assistantMessage.streaming = false;
      setConversations([...convList]);
      saveConversations(convList);
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerate = () => {
    if (!activeConversation || activeConversation.messages.length === 0 || isStreaming) return;
    const lastUserMsg = [...activeConversation.messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      if (lastUserMsg.provider && lastUserMsg.model) {
        setCurrentProvider(lastUserMsg.provider);
        setCurrentModel(lastUserMsg.model);
      }
      // Remove last assistant message
      activeConversation.messages = activeConversation.messages.filter(
        (m, idx) => !(idx === activeConversation.messages.length - 1 && m.role === 'assistant')
      );
      setConversations([...conversations]);
      saveConversations([...conversations]);
      handleSendMessage(lastUserMsg.content);
    }
  };

  const activeProvider = getProvider(currentProvider);
  const activeModelInfo = getModel(currentProvider, currentModel);
  const isCurrentReady = isProviderReady(currentProvider, configs, serverStatus);

  // Quick prompt suggestions
  const PROMPT_SUGGESTIONS = [
    {
      title: 'Compare AI Providers',
      desc: 'Highlight latency and architecture differences between Gemini, Groq, and DeepSeek',
    },
    {
      title: 'Debug React 19 Hook',
      desc: 'Fix an asynchronous race condition in a custom useEffect hook with TypeScript',
    },
    {
      title: 'Explain Quantum Computing',
      desc: 'Explain quantum superposition and entanglement using an everyday physical analogy',
    },
    {
      title: 'Code REST API with Express',
      desc: 'Write an authenticated streaming Server-Sent Events endpoint in Node.js',
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Sidebar for History */}
      <Sidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenSettings={() => handleOpenSettings()}
        configs={configs}
        serverStatus={serverStatus}
      />

      {/* Main Chat Workspace */}
      <div className="flex flex-1 flex-col h-full overflow-hidden bg-[#000000]">
        {/* Top Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4 backdrop-blur-xl bg-black/60 z-20">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Toggle History Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Model Selector Dropdown */}
            <ModelSelector
              currentProvider={currentProvider}
              currentModel={currentModel}
              onSelect={handleSelectModel}
              configs={configs}
              serverStatus={serverStatus}
              onOpenSettings={handleOpenSettings}
              availableModels={availableModels}
              onRefreshModels={handleRefreshModels}
              isRefreshingModels={isRefreshingModels}
            />
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-2">
            {/* System Instructions Pill */}
            <button
              onClick={() => setSystemPromptOpen(true)}
              className={`flex items-center space-x-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                systemPrompt
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                  : 'border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
              title="Configure System Prompt"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {systemPrompt ? 'Custom Persona' : 'Persona'}
              </span>
            </button>

            {/* Personal API Usage Dashboard Button */}
            <button
              onClick={() => setUsageDashboardOpen(true)}
              className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 hover:border-cyan-500/30 hover:text-cyan-300 transition-all"
              title="Personal API Usage Dashboard"
            >
              <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Usage Stats</span>
            </button>

            {/* Provider API Keys Button */}
            <button
              onClick={() => handleOpenSettings()}
              className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 hover:border-white/20 transition-all"
              title="Configure Provider API Keys"
            >
              <Key className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline">API Keys</span>
            </button>

            {/* New Chat Quick Icon Button */}
            <button
              onClick={handleNewChat}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 transition-colors shadow-md shadow-cyan-500/20"
              title="Start New Chat"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Chat Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            /* Hero Empty State */
            <div className="mx-auto flex max-w-2xl flex-col items-center justify-center pt-6 sm:pt-10 text-center">
              {/* Zafi's AI Logo */}
              <div className="relative mb-3 group">
                <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 opacity-70 blur-md group-hover:opacity-100 transition duration-500"></div>
                <img
                  src="/assets/aistudio/IMG-20261107-WA4628_28c72ae7.jpg"
                  alt="Zafi's AI Logo"
                  className="relative h-20 w-20 rounded-2xl object-cover border border-amber-500/40 shadow-2xl"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-950/40 text-amber-300 text-xs font-bold tracking-wide uppercase mb-3">
                Zafi's AI Studio
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Chat with {activeModelInfo.name}
              </h1>

              <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md">
                {activeModelInfo.description}
              </p>

              {/* Model Feature Badges */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
                {activeModelInfo.isFree ? (
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Gift className="h-3.5 w-3.5" />
                    <span>{activeModelInfo.tierLabel}</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-amber-400 font-semibold flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    <span>{activeModelInfo.tierLabel}</span>
                  </span>
                )}

                <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-slate-300 font-mono text-[11px]">
                  Context: {activeModelInfo.contextWindow}
                </span>

                <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-slate-300">
                  Provider: {activeProvider.name}
                </span>
              </div>

              {/* Notice if provider is NOT ready */}
              {!isCurrentReady && (
                <div className="mt-6 w-full max-w-md rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-left shadow-xl animate-in zoom-in-95">
                  <div className="flex items-start space-x-3">
                    <Key className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-amber-300">
                        API Key Required for {activeProvider.name}
                      </div>
                      <div className="mt-1 text-xs text-amber-200/80">
                        This provider requires an API key to communicate with real models. Add your key to start chatting.
                      </div>
                      <div className="mt-3 flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenSettings(currentProvider)}
                          className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-black hover:bg-amber-400 transition-colors shadow-md"
                        >
                          Configure API Key
                        </button>
                        <button
                          onClick={() => handleSelectModel('gemini', 'gemini-3.1-flash-lite')}
                          className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
                        >
                          Switch to Free Gemini
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Prompt Suggestion Cards */}
              <div className="mt-10 grid w-full grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {PROMPT_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.desc)}
                    className="group rounded-2xl border border-white/10 bg-neutral-900/40 p-3.5 backdrop-blur-xl transition-all duration-200 hover:border-cyan-500/40 hover:bg-neutral-850 hover:shadow-lg hover:shadow-cyan-500/5 text-left"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200 group-hover:text-cyan-300">
                      <span>{item.title}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:translate-x-1 group-hover:text-cyan-400 transition-all" />
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages List */
            <div className="mx-auto max-w-4xl space-y-4">
              {activeConversation.messages.map((message) => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  onRegenerate={handleRegenerate}
                  onOpenSettings={handleOpenSettings}
                />
              ))}
              <div ref={chatBottomRef} />
            </div>
          )}
        </div>

        {/* Floating Input Dock at Bottom */}
        <div className="shrink-0 p-4 sm:px-8 pb-5 z-20">
          <div className="mx-auto max-w-4xl">
            <div className="glass-input relative flex flex-col rounded-3xl border border-white/15 bg-neutral-950/80 p-2 shadow-2xl backdrop-blur-2xl">
              {/* Selected Model Tag Bar inside input */}
              <div className="flex items-center justify-between px-3 pt-1.5 pb-1 text-[11px] text-slate-400 border-b border-white/5">
                <div className="flex items-center space-x-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: activeProvider.accentColor }}
                  />
                  <span className="font-semibold text-slate-300">{activeModelInfo.name}</span>
                  <span className="text-slate-500">via {activeProvider.name}</span>
                  {activeModelInfo.isFree && (
                    <span className="text-[10px] text-emerald-400 font-semibold">• Free Tier</span>
                  )}
                </div>

                {systemPrompt && (
                  <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>Custom Persona Active</span>
                  </span>
                )}
              </div>

              {/* Textarea */}
              <div className="flex items-end space-x-2 px-2 pt-2 pb-1">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Ask ${activeModelInfo.name}... (Press Enter to send, Shift+Enter for newline)`}
                  className="max-h-44 flex-1 resize-none bg-transparent px-2 py-1 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                />

                {/* Send / Stop Buttons */}
                <div className="flex items-center space-x-1.5 pb-0.5">
                  {isStreaming ? (
                    <button
                      onClick={handleStopGeneration}
                      className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 transition-colors shadow-lg shadow-rose-500/20"
                      title="Stop generation"
                    >
                      <Square className="h-4 w-4 fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!inputPrompt.trim()}
                      className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-all ${
                        inputPrompt.trim()
                          ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 scale-100'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed'
                      }`}
                      title="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Disclaimer & Privacy guarantee */}
            <div className="mt-2 flex items-center justify-between px-3 text-[10px] text-slate-500">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span>Encrypted backend proxy • Direct provider HTTPS streaming</span>
              </span>
              <span>
                Default engine: <strong className="text-slate-400">Gemini 3.8 Flash</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Provider API Keys & Settings Modal */}
      <ProviderSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        configs={configs}
        onSaveConfigs={handleSaveConfigs}
        serverStatus={serverStatus}
        initialProvider={settingsInitialProvider}
      />

      {/* System Instructions / Persona Modal */}
      <SystemPromptModal
        isOpen={systemPromptOpen}
        onClose={() => setSystemPromptOpen(false)}
        systemPrompt={systemPrompt}
        onSavePrompt={(p) => {
          setSystemPrompt(p);
          if (activeConversation) {
            const updated = conversations.map((c) =>
              c.id === activeConversation.id ? { ...c, systemPrompt: p } : c
            );
            setConversations(updated);
            saveConversations(updated);
          }
        }}
      />

      {/* Personal API Usage Dashboard Modal */}
      <UsageDashboardModal
        isOpen={usageDashboardOpen}
        onClose={() => setUsageDashboardOpen(false)}
        usageStats={usageStats}
        onResetStats={() => {
          const res = recordTokenUsage('gemini', 0, 0, 0);
          saveUsageStats(DEFAULT_USAGE_STATS);
          setUsageStats(DEFAULT_USAGE_STATS);
        }}
      />
    </div>
  );
}
