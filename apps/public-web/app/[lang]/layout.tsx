import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import '@sep/ui/styles.css';
export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (lang !== 'es' && lang !== 'en') notFound();
  return <html lang={lang}><body>{children}</body></html>;
}
