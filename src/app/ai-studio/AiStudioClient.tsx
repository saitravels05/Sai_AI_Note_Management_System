"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { askYourDataAction, AiChatResponse } from "@/server/actions/ai.actions";
import { parseSentenceAction } from "@/server/actions/notes.actions";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Zap,
  HelpCircle,
  FileText,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Globe,
  Database,
} from "lucide-react";

interface AiStudioClientProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  source?: "gemini" | "local_analytics";
  confidence?: number;
  dataPointsUsed?: number;
  timestamp: string;
}

const SAMPLE_PROMPTS = [
  "What is our total net profit and money received so far?",
  "How much money is pending in customer dues?",
  "Who are the top travel suppliers and what are their balances?",
  "Draft a polite Tamil WhatsApp reminder for delayed passport dues",
  "Summarize our flight ticket vs passport service earnings",
  "What was our single biggest expense recorded this month?",
];

export function AiStudioClient({ user }: AiStudioClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: `Vanakkam ${user.name.split(" ")[0]}! I am your Sai Books Gemini AI Financial Intelligence Partner. I have live access to your PostgreSQL database, notes journal, and customer balances. You can ask me questions in English or தமிழ் (Tamil).`,
      source: "gemini",
      confidence: 1.0,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // OCR / Messy text smart parser
  const [rawText, setRawText] = useState("");
  const [parsedCard, setParsedCard] = useState<any | null>(null);
  const [isParsingText, setIsParsingText] = useState(false);

  const handleSendMessage = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const res = await askYourDataAction(q);
      const aiMsg: ChatMessage = {
        sender: "ai",
        text: res.answer,
        source: res.source,
        confidence: res.confidence,
        dataPointsUsed: res.dataPointsUsed,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `Error analyzing data: ${err.message || "Failed to process query."}`,
          source: "local_analytics",
          timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseRawText = async () => {
    if (!rawText.trim() || isParsingText) return;
    setIsParsingText(true);
    try {
      const res = await parseSentenceAction(rawText);
      setParsedCard(res);
    } catch (err: any) {
      alert(err.message || "Failed to parse text");
    } finally {
      setIsParsingText(false);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <AppShell user={user}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Gemini AI Financial Intelligence Studio
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Conversational database analytics, zero-hallucination math, and multilingual Tamil/English intelligence
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-900">
              <Database className="w-3.5 h-3.5 text-purple-600" />
              <span>Grounded on Live PostgreSQL</span>
            </span>
          </div>
        </div>

        {/* 2-Column Layout: Chat on Left, OCR & Prompt Library on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Interface (2 Columns) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-[650px] overflow-hidden">
            {/* Chat Messages Scroll Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.map((m, idx) => {
                const isUser = m.sender === "user";

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                        isUser
                          ? "bg-orange-600"
                          : "bg-gradient-to-br from-purple-600 to-indigo-600"
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-3xl p-4 text-xs leading-relaxed space-y-2 ${
                        isUser
                          ? "bg-orange-600 text-white rounded-tr-xs"
                          : "bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 rounded-tl-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>

                      <div
                        className={`flex items-center justify-between gap-3 text-[10px] pt-1 border-t ${
                          isUser
                            ? "border-orange-500/50 text-orange-200"
                            : "border-slate-200 dark:border-slate-700 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{m.timestamp}</span>
                          {!isUser && m.source && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold font-mono">
                              {m.source === "gemini" ? "Gemini 3.8 Flash" : "Local Engine"}
                            </span>
                          )}
                        </div>

                        {!isUser && (
                          <button
                            onClick={() => copyToClipboard(m.text, idx)}
                            className="hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                          >
                            {copiedIdx === idx ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedIdx === idx ? "Copied" : "Copy"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-spin" />
                    <span>Analyzing database records with Gemini AI...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask any financial question in English or தமிழ் (Tamil)..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputQuery.trim()}
                  className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-purple-500/20 transition disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Prompt Library + Smart Text Scanner */}
          <div className="space-y-6">
            {/* Quick Prompt Library */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Quick Query Library
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Click any pre-crafted question to query your business instantly:
              </p>

              <div className="space-y-2">
                {SAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 font-medium hover:text-purple-600 dark:hover:text-purple-300 transition"
                  >
                    &quot;{prompt}&quot;
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Bill / Text Scanner */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Smart Text / Receipt Parser
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Paste any unstructured travel ticket or note to extract amount, category, and customer:
              </p>

              <textarea
                rows={3}
                placeholder="e.g. Received 7500 from Anbu for Singapore Visa via GPay on today"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />

              <button
                onClick={handleParseRawText}
                disabled={isParsingText || !rawText.trim()}
                className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isParsingText ? "Parsing..." : "AI Auto-Extract"}</span>
              </button>

              {parsedCard && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs space-y-1">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Extracted Result:</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    <div><strong>Title:</strong> {parsedCard.title}</div>
                    <div><strong>Type:</strong> {parsedCard.type}</div>
                    <div><strong>Category:</strong> {parsedCard.category}</div>
                    <div><strong>Amount:</strong> ₹{parsedCard.amount}</div>
                    <div><strong>Payment Mode:</strong> {parsedCard.paymentMode}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
