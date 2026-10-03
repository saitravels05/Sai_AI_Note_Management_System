"use client";

import React, { useState } from "react";
import { askYourDataAction, AiChatResponse } from "@/server/actions/ai.actions";
import { generatePaymentReminder } from "@/lib/gemini";
import { Language, translations } from "@/lib/i18n";
import {
  Sparkles,
  Send,
  MessageSquare,
  Copy,
  Check,
  X,
  Loader2,
  HelpCircle,
  Share2,
} from "lucide-react";

interface AiChatModalProps {
  lang: Language;
  onClose: () => void;
}

export function AiChatModal({ lang, onClose }: AiChatModalProps) {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<"ask" | "reminder" | "help">("ask");

  // Ask Your Data State
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "ai"; text: string; confidence?: number }>
  >([
    {
      role: "ai",
      text:
        lang === "ta"
          ? "வணக்கம்! நான் உங்கள் சாய் புக்ஸ் AI உதவியாளர். உங்கள் வரவு-செலவு, லாபம் அல்லது நிலுவைத் தொகைகள் பற்றி ஏதேனும் கேட்கலாம்."
          : "Hello! I am your SAI Books AI Assistant. Ask me anything about your tours profit, collections, or pending dues.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // WhatsApp Reminder State
  const [customerName, setCustomerName] = useState("");
  const [dueAmount, setDueAmount] = useState("");
  const [serviceName, setServiceName] = useState("Goa Tour Package");
  const [reminderDraft, setReminderDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userText = question;
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setQuestion("");
    setIsLoading(true);

    try {
      const res = await askYourDataAction(userText);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: res.answer, confidence: res.confidence },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "I was unable to retrieve data right now. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !dueAmount) return;

    const draft = generatePaymentReminder(
      customerName,
      dueAmount,
      serviceName,
      "Soon",
      lang
    );
    setReminderDraft(draft);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reminderDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                SAI Books AI Assistant
              </h3>
              <p className="text-xs text-gray-500">Gemini 3.8 Flash • Zero-Hallucination</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("ask")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "ask"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}
          >
            Ask Your Data
          </button>
          <button
            onClick={() => setActiveTab("reminder")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "reminder"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}
          >
            WhatsApp Reminder Draft
          </button>
          <button
            onClick={() => setActiveTab("help")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "help"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}
          >
            Beginner Jargon Guide
          </button>
        </div>

        {/* Tab 1: Ask Your Data Chat */}
        {activeTab === "ask" && (
          <div className="flex-1 flex flex-col min-h-[350px] overflow-hidden pt-4">
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-orange-600 text-white rounded-br-none"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none"
                    }`}
                  >
                    <div>{m.text}</div>
                    {m.confidence && (
                      <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-orange-400" />
                        Confidence: {(m.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-3 text-xs flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                    <span>Analyzing books data...</span>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700 mt-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask e.g. What is our net profit this month?"
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="p-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: WhatsApp Due Reminder */}
        {activeTab === "reminder" && (
          <div className="py-4 space-y-4">
            <p className="text-xs text-gray-500">
              Generate polite, professional payment reminder messages in English or Tamil ready to copy and send via WhatsApp.
            </p>

            <form onSubmit={handleGenerateReminder} className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Due Amount (₹) *
                </label>
                <input
                  type="text"
                  required
                  value={dueAmount}
                  onChange={(e) => setDueAmount(e.target.value)}
                  placeholder="e.g. 5,000"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Service / Package
                </label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g. Chennai Flight Ticket / Singapore Visa"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                className="col-span-2 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-xs cursor-pointer"
              >
                Generate Message
              </button>
            </form>

            {reminderDraft && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <span>WhatsApp Draft Ready:</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-emerald-100">
                  {reminderDraft}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Beginner Jargon Guide */}
        {activeTab === "help" && (
          <div className="py-4 space-y-3 overflow-y-auto max-h-[350px]">
            <p className="text-xs text-gray-500 mb-2">
              Accounting terms explained in plain, beginner-friendly language:
            </p>
            {Object.entries(t.accountingTerms).map(([term, desc]) => (
              <div
                key={term}
                className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800"
              >
                <h5 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-0.5">
                  {term}
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-300">{desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
