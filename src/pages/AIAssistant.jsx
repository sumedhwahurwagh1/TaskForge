import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateAIResponse, QUICK_PROMPTS } from '../utils/aiEngine';
import { can, ACTIONS as RBAC_ACTIONS } from '../permissions/rbac';

export default function AIAssistant() {
  const { state, currentUser, assignmentsWithProgress, isStudent } = useApp();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `👋 Hi ${currentUser.name}! I'm your TaskForge AI copilot. I can help you prioritize your assignments, plan your week, and stay on top of your academic workload.\n\nWhat would you like to know?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // If user is a teacher, show role note
  if (!isStudent && !can(currentUser, RBAC_ACTIONS.AI_ACCESS)) {
    return (
      <div className="ai-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <ShieldAlert size={36} color="#f59e0b" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Student Copilot Feature</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            TaskForge AI is tailored for students to assist with assignment prioritization and weekly workload planning. Switch to the Student persona (Alex Rivera) using the Demo Mode switcher above to interact with the AI copilot.
          </p>
        </div>
      </div>
    );
  }

  const handleSend = async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    // Simulate brief thinking delay for natural feel
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // AI uses assignmentsWithProgress to stay completely in sync with Focus Today
      const response = generateAIResponse(userMessage, assignmentsWithProgress, state.notices);
      setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ AI copilot is temporarily unavailable. Core assignment tracking remains active. Please try again.',
        },
      ]);
    }

    setIsTyping(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Simple markdown-like rendering: bold and bullet points
  const renderContent = (content) => {
    return content.split('\n').map((line, i) => {
      let rendered = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      if (rendered.startsWith('• ') || rendered.startsWith('- ')) {
        rendered = `<span style="display:block;padding-left:12px;">${rendered}</span>`;
      }
      return <span key={i} dangerouslySetInnerHTML={{ __html: rendered || '&nbsp;' }} style={{ display: 'block' }} />;
    });
  };

  return (
    <div className="ai-container">
      <div className="ai-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={28} style={{ color: 'var(--primary)' }} />
          TaskForge AI
        </h1>
        <p className="page-subtitle">Your personal academic workload copilot.</p>
      </div>

      <div className="ai-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`ai-message ${msg.role}`}>
            <div className="ai-message-avatar">
              {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
            </div>
            <div className="ai-message-bubble">{renderContent(msg.content)}</div>
          </div>
        ))}

        {isTyping && (
          <div className="ai-message assistant">
            <div className="ai-message-avatar">
              <Bot size={18} />
            </div>
            <div className="ai-message-bubble" style={{ color: 'var(--text-tertiary)' }}>
              TaskForge AI is analyzing your deadlines...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div className="ai-quick-prompts">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              className="ai-quick-prompt"
              onClick={() => handleSend(prompt.label)}
            >
              <span>{prompt.icon}</span>
              {prompt.label}
            </button>
          ))}
        </div>
      )}

      <div className="ai-input-area">
        <input
          type="text"
          className="form-input"
          placeholder="Ask TaskForge AI: 'What should I work on first?', 'Plan my week'..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="AI chat input"
        />
        <button
          className="btn btn-primary"
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
