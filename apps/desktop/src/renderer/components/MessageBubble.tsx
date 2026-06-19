import type { Message } from '@ai-hub/provider-core';

interface Props { message: Message }

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words
          ${isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-card border border-border text-foreground rounded-bl-sm'
          }
        `}
      >
        {message.content || <span className="opacity-40 italic">...</span>}
      </div>
    </div>
  );
}
