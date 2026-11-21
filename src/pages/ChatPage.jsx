import React, { useState, useRef, useEffect } from 'react';
import { Send, Camera, Sparkles, LoaderCircle, Bot, User } from 'lucide-react';
import { sendChatMessage, uploadReceipt } from '../api/chat';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '../utils/formatters';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your financial assistant. Ask me anything about your spending, or upload a receipt using the camera button.",
  timestamp: new Date(),
  kind: 'greeting',
};

export function ChatPage() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: String(Date.now()),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await sendChatMessage(text, history);

      const assistantMsg = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: response.reply || response.message || 'I processed that.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      queryClient.invalidateQueries();
    } catch (err) {
      const errorMsg = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${
          err instanceof Error ? err.message : 'Please try again.'
        }`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;

    const userUploadMsg = {
      id: String(Date.now()),
      role: 'user',
      content: `Uploading receipt: ${file.name}`,
      timestamp: new Date(),
      kind: 'receipt',
    };

    setMessages((prev) => [...prev, userUploadMsg]);
    setIsUploading(true);

    try {
      const response = await uploadReceipt(file);
      queryClient.invalidateQueries();

      let replyContent = 'Receipt processed successfully!';
      if (response.transaction) {
        const tx = response.transaction;
        replyContent = `Receipt processed successfully!\n\n**${tx.merchant}** — ${formatCurrency(
          Number(tx.amount)
        )}\nCategory: ${tx.category}\nDate: ${tx.date}`;
      }

      const assistantMsg = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: replyContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: `Could not process receipt: ${
          err instanceof Error ? err.message : 'Please try again.'
        }`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                isUser ? 'flex-row-reverse' : ''
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                  isUser
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-muted text-primary-700'
                }`}
              >
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </span>

              <div
                className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-primary-600 text-white'
                    : msg.isError
                    ? 'bg-danger-50 text-danger-700 border border-danger-100'
                    : 'card text-ink'
                }`}
              >
                <div className="whitespace-pre-line">{msg.content}</div>
              </div>
            </div>
          );
        })}

        {(isLoading || isUploading) && (
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-primary-700">
              <Bot size={16} />
            </span>
            <div className="card flex items-center gap-2 px-4 py-3 text-xs text-ink-muted">
              <LoaderCircle size={15} className="animate-spin text-primary-600" />
              <span>
                {isUploading ? 'Analyzing receipt image...' : 'Thinking...'}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-line bg-white/90 p-3 backdrop-blur-xl">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isLoading}
            aria-label="Upload receipt photo"
            className="icon-btn border border-line bg-surface-muted shrink-0"
          >
            <Camera size={18} />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your spending..."
            className="input flex-1 text-sm"
            disabled={isLoading || isUploading}
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading || isUploading}
            aria-label="Send message"
            className="btn-primary h-11 w-11 rounded-full p-0 flex items-center justify-center shrink-0"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
