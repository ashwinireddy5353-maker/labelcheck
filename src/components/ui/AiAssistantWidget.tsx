import React, { useState } from 'react';
import { Sparkles, MessageSquare, X, Send, Bot, User as UserIcon, ShieldAlert } from 'lucide-react';
import { Button } from './Button';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
}

export const AiAssistantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: 'Hello! I am LabelCheck Assistant. Ask me anything about ingredient safety, EWG scores, or skin sensitivity guidance.',
    },
  ]);

  const handleSend = (userQuery?: string) => {
    const textToSend = userQuery || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = { id: `u_${Date.now()}`, sender: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (!userQuery) setInput('');

    // Generate intelligent AI response based on query keywords
    setTimeout(() => {
      let aiText = 'LabelCheck analyzes ingredients against public registries (EU CosIng, EWG Skin Deep) and your saved profile preferences.';
      const query = textToSend.toLowerCase();

      if (query.includes('phenoxyethanol') || query.includes('eczema')) {
        aiText = 'Phenoxyethanol is a widely used preservative. At concentrations < 1%, it is generally safe, though eczema-prone skin may experience mild stinging in compromised skin barriers.';
      } else if (query.includes('paraben') || query.includes('hazard')) {
        aiText = 'Parabens (e.g., Methylparaben, Propylparaben) act as antimicrobial preservatives but exhibit weak estrogenic activity in vitro, prompting many clean beauty standards to avoid them.';
      } else if (query.includes('score') || query.includes('calculated')) {
        aiText = 'Safety scores (0–100) deduct points for hazardous releasers (-25 to -35), allergens (-15), and irritants (-10), matching strictly against your personal profile watchlists.';
      } else if (query.includes('fragrance') || query.includes('parfum')) {
        aiText = 'Fragrance / Parfum is the #1 cause of cosmetic contact dermatitis worldwide because it hides dozens of undisclosed aroma chemicals under one label term.';
      }

      const aiMsg: Message = { id: `a_${Date.now()}`, sender: 'ai', text: aiText };
      setMessages((prev) => [...prev, aiMsg]);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="w-80 sm:w-96 h-[460px] bg-slate-900 border border-slate-700 text-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-teal-600 text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">LabelCheck AI Assistant</h4>
                <p className="text-[10px] text-teal-400 font-semibold">● Online • Ingredient Intelligence</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-teal-900 text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[80%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-teal-700 text-white rounded-br-xs'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-xs'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Preset Prompt Chips */}
          <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 flex gap-1.5 overflow-x-auto">
            {['Is Phenoxyethanol safe?', 'Parabens & Hazards', 'How is score calculated?'].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-[10px] whitespace-nowrap border border-slate-700"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask about an ingredient..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-teal-500"
            />
            <Button variant="primary" size="sm" onClick={() => handleSend()} className="p-2">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white rounded-full shadow-2xl border border-teal-400/40 transition-all hover:scale-105 group font-bold text-xs"
        >
          <Sparkles className="w-4 h-4 text-teal-200 group-hover:rotate-12 transition-transform" />
          <span>Ask AI Assistant</span>
        </button>
      )}
    </div>
  );
};
