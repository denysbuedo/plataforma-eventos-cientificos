'use client';
import { useParams } from 'next/navigation';
import { webCopy } from '@sep/i18n';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const text = webCopy[useParams().lang === 'en' ? 'en' : 'es'];
  return <main className="public-empty"><div className="empty-state"><h1>{text.serviceTitle}</h1><p>{text.serviceHelp}</p><button className="button button-primary" onClick={reset}>{text.retry}</button></div></main>;
}
