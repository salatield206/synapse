import './globals.css';

export const metadata = {
  title: 'Synapse Study System',
  description: 'Repositório universal de estudos'
};

export default function RootLayout({ children }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}