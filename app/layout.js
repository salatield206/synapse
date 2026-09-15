import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Synapse Study System',
  description: 'Repositório universal de estudos'
};

export default function RootLayout({ children }) {
  return <html lang="pt-BR"><body><Providers>{children}</Providers></body></html>;
}