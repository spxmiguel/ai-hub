import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'AI Hub',
  description: 'Unified AI interface — Claude, GPT, Gemini, Ollama',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
