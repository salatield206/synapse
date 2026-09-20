import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Synapse Study System',
  description: 'Repositório universal de estudos'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }) {
  return <html lang="pt-BR"><body className="bg-synapse-soft-pink text-synapse-text"><Providers>{children}</Providers></body></html>;
}