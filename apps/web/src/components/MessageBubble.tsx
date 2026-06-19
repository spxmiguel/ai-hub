import type { Message } from '@ai-hub/provider-core';
import { cn } from '@/lib/cn';

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed whitespace-pre-wrap bg-[#2f2f2f] text-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className={cn('w-full text-sm leading-7 whitespace-pre-wrap text-foreground/90', !message.content && 'text-muted-foreground animate-pulse')}>
        {message.content || '...'}
      </div>
    </div>
  );
}
