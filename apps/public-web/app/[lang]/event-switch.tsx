'use client';
import { useRouter } from 'next/navigation';
export default function EventSwitch({ current, locale, label }: { current: string; locale: string; label: string }) {
  const router = useRouter();
  return <select className="event-switch" aria-label={label} value={current} onChange={(event) => router.push(`/${locale}?event=${encodeURIComponent(event.target.value)}`)}>
    <option value="a1">Biosfera 2026</option><option value="b1">Horizontes 2026</option>
  </select>;
}
