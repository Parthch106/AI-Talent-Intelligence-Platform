import React, { useState, useEffect, useRef } from 'react';
import { 
    MessageSquare, X, Send, Bot, User, 
    Maximize2, Minimize2, 
    Sparkles, RefreshCw, AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';


interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

const FloatingAIChatbot: React.FC = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: `Hello ${user?.full_name?.split(' ')[0] || 'there'}! I'm your AI Project Assistant. How can I help you navigate the Talent Intelligence Platform today?`,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen && !isMinimized) {
            scrollToBottom();
        }
    }, [messages, isOpen, isMinimized]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            // Prepare history for backend (excluding system messages or excessive length)
            const history = messages
                .filter(m => m.role !== 'system')
                .slice(-10)
                .map(m => ({
                    role: m.role,
                    content: m.content
                }));

            const response = await api.post('/analytics/chat/', {
                message: userMessage.content,
                history: history
            });

            if (response.data && response.data.response) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: response.data.response,
                    timestamp: new Date()
                }]);
            } else {
                throw new Error("Invalid response from assistant");
            }
        } catch (err: unknown) {
            console.error("Chat error:", err);
            setError("Failed to get response. Please try again.");
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm having trouble connecting to my central intelligence. Please check your connection or try again in a moment.",
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([
            {
                role: 'assistant',
                content: "Chat history cleared. How can I assist you with the project now?",
                timestamp: new Date()
            }
        ]);
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">
            {/* Chat Window */}
            {isOpen && (
                <div 
                    className={`
                        pointer-events-auto mb-4 w-96 max-w-[calc(100vw-3rem)] 
                        bg-[var(--card-bg)] backdrop-blur-3xl border border-[var(--border-color)] 
                        rounded-[32px] overflow-hidden shadow-2xl transition-all duration-300 origin-bottom-right
                        ${isMinimized ? 'h-16' : 'h-[600px] max-h-[calc(100vh-8rem)]'}
                    `}
                >
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border-b border-[var(--border-color)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Bot className="text-white" size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-[var(--text-main)] tracking-tight">PROJECT ASSISTANT</h3>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80">Online</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={clearChat}
                                className="p-2 text-[var(--text-muted)] hover:text-purple-400 transition-colors rounded-xl hover:bg-white/5"
                                title="Clear History"
                            >
                                <RefreshCw size={16} />
                            </button>
                            <button 
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors rounded-xl hover:bg-white/5"
                            >
                                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                            </button>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-[var(--text-muted)] hover:text-red-400 transition-colors rounded-xl hover:bg-white/5"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(100%-8.5rem)] custom-scrollbar bg-white/[0.01]">
                                {messages.map((msg, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                                    >
                                        <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`
                                                w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center
                                                ${msg.role === 'user' 
                                                    ? 'bg-slate-700/50 text-slate-300' 
                                                    : 'bg-purple-600/20 text-purple-400 border border-purple-500/20'}
                                            `}>
                                                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                            </div>
                                            <div className={`
                                                p-3 rounded-2xl text-xs leading-relaxed font-medium shadow-sm
                                                ${msg.role === 'user' 
                                                    ? 'bg-indigo-600/90 text-white rounded-tr-none' 
                                                    : 'bg-[var(--bg-muted)] text-[var(--text-dim)] border border-[var(--border-color)] rounded-tl-none'}
                                            `}>
                                                {msg.role === 'user' ? (
                                                    msg.content
                                                ) : (
                                                    <div className="markdown-content prose prose-invert prose-xs max-w-none">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                )}
                                                <div className={`text-[8px] mt-1.5 opacity-40 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start animate-fade-in">
                                        <div className="flex gap-3 max-w-[85%]">
                                            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center animate-pulse">
                                                <Bot size={14} />
                                            </div>
                                            <div className="p-3 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {error && (
                                    <div className="flex justify-center">
                                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
                                            <AlertCircle size={12} />
                                            {error}
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <form 
                                onSubmit={handleSendMessage}
                                className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-muted)]/50 flex items-center gap-2"
                            >
                                <input 
                                    type="text" 
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything about the platform..."
                                    className="flex-1 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl px-4 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-medium"
                                />
                                <button 
                                    disabled={!input.trim() || isLoading}
                                    className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:scale-100"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            )}

            {/* Toggle Button */}
            <button 
                onClick={() => {
                    setIsOpen(!isOpen);
                    setIsMinimized(false);
                }}
                className={`
                    pointer-events-auto p-4 rounded-[24px] shadow-2xl transition-all duration-500 group relative
                    ${isOpen ? 'bg-red-500 hover:bg-red-600 rotate-90 scale-90' : 'bg-gradient-to-br from-purple-600 to-indigo-600 hover:scale-110 active:scale-90'}
                `}
            >
                <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[32px] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                {isOpen ? (
                    <X className="text-white relative z-10" />
                ) : (
                    <div className="flex items-center gap-2 relative z-10">
                        <MessageSquare className="text-white" />
                        <Sparkles className="text-yellow-300 animate-pulse absolute -top-1 -right-1" size={14} />
                    </div>
                )}
                {!isOpen && (
                    <div className="absolute bottom-full right-0 mb-4 bg-[var(--card-bg)] border border-[var(--border-color)] px-4 py-2 rounded-2xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">Project Assistant</p>
                    </div>
                )}
            </button>
        </div>
    );
};

export default FloatingAIChatbot;
