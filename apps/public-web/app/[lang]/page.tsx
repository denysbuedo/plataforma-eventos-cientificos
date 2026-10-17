import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { webCopy, type Locale } from '@sep/i18n';
import { Brand, Icon, ScienceArt } from '@sep/ui';
import { loadPublicSite, ApiTransportError } from '@sep/web-server';
import EventSwitch from './event-switch';
import Program from './program';
import ScientificCall from './scientific-call';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ event?: string }> };
async function dataFor(props: Props) {
  const { lang } = await props.params;
  if (lang !== 'es' && lang !== 'en') notFound();
  const query = await props.searchParams;
  const host = (await headers()).get('host') ?? '';
  return { ...await loadPublicSite(host, query.event, lang), locale: lang as Locale };
}
export async function generateMetadata(props: Props): Promise<Metadata> {
  try {
    const { site, binding, locale } = await dataFor(props);
    const query = binding.config ? `?event=${binding.key}` : '';
    return { title: locale === 'es' ? site.event.nameEs : site.event.nameEn,
      description: (locale === 'es' ? site.content.summaryEs : site.content.summaryEn).slice(0, 160),
      metadataBase: new URL(binding.config?.publicUrl ?? process.env.SEP_PUBLIC_ORIGIN ?? `https://${binding.host}`),
      alternates: { canonical: `/${locale}${query}`, languages: { es: `/es${query}`, en: `/en${query}` } },
      robots: binding.config ? { index: false, follow: false } : { index: true, follow: true } };
  } catch { return { title: 'SEP', robots: { index: false, follow: false } }; }
}
export default async function PublicPage(props: Props) {
  let loaded: Awaited<ReturnType<typeof dataFor>>;
  try { loaded = await dataFor(props); }
  catch (error) {
    if (error instanceof ApiTransportError && error.status === 404) notFound();
    const lang = (await props.params).lang === 'en' ? 'en' : 'es'; const text = webCopy[lang];
    return <main className="public-empty"><div className="empty-state"><Brand /><h1>{text.serviceTitle}</h1><p>{text.serviceHelp}</p><a className="button button-primary" href={`/${lang}`}>{text.retry}</a></div></main>;
  }
  const { site, binding, locale, scientificCall,program } = loaded;
  const text = webCopy[locale]; const c = site.content; const spanish = locale === 'es';
  const hero = spanish ? c.heroTitleEs : c.heroTitleEn; const lines = hero.split('\n');
  const query = binding.config ? `?event=${binding.key}` : '';
  const adminUrl = binding.config ? `${binding.config.adminUrl}/${locale}${query}` : process.env.SEP_ADMIN_ORIGIN;
  const authorUrl = `${binding.config?.adminUrl ?? process.env.SEP_ADMIN_ORIGIN ?? ''}/${locale}?event=${encodeURIComponent(binding.config ? binding.key : site.event.id)}&tab=works`;
  const date = (value: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(new Date(`${value}T12:00:00Z`));
  const dates = `${date(c.startDate, { day: 'numeric' })}–${date(c.endDate, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Event', name: spanish ? site.event.nameEs : site.event.nameEn,
    startDate: c.startDate, endDate: c.endDate, description: spanish ? c.summaryEs : c.summaryEn,
    location: { '@type': 'Place', name: spanish ? c.venueEs : c.venueEn } };
  return <div className={`public-page theme-${c.theme}`}>
    <a href="#main" className="skip-link">{text.skip}</a>
    <header className="public-nav">
      <a href={`/${locale}${query}`} className="event-wordmark"><span className="event-symbol"><Icon name={c.theme === 'forest' ? 'leaf' : 'globe'} size={19} /></span>{c.acronym}</a>
      <nav aria-label={text.encounter}><a href="#encuentro">{text.encounter}</a><a href="#convocatoria">{text.call}</a>{program&&<a href="#programa">{spanish?'Programa':'Program'}</a>}<a href="#sede">{text.venue}</a></nav>
      <div className="nav-end">{binding.config && <EventSwitch current={binding.key} locale={locale} label={text.search} />}<div className="language-switch"><a href={`/es${query}`} className={spanish ? 'active' : ''} lang="es">ES</a><a href={`/en${query}`} className={!spanish ? 'active' : ''} lang="en">EN</a></div></div>
    </header>
    <main id="main">
      <div className="hero-wrap"><section className="public-hero">
        <div className="hero-copy"><div className="hero-kicker"><i />{spanish ? c.kickerEs : c.kickerEn}</div>
          <h1>{lines[0]}{lines.length > 1 && <em>{lines.slice(1).join(' ')}</em>}</h1>
          <p>{spanish ? c.summaryEs : c.summaryEn}</p>
          <div className="hero-actions"><a href="#encuentro" className="button button-white pill-button">{text.explore}<Icon name="arrow" size={17} /></a><a href="#convocatoria" className="button button-text">{text.viewCall}<Icon name="arrow" size={15} /></a></div>
          <div className="hero-footnote"><Icon name="globe" size={13} /><span>{text.science} &nbsp;·&nbsp; {text.community} &nbsp;·&nbsp; {text.future}</span></div>
        </div><ScienceArt theme={c.theme} year={c.startDate.slice(2, 4)} />
      </section></div>
      <div className="event-facts"><div className="event-fact"><Icon name="calendar" size={25} /><div><small>{text.when}</small><strong>{dates}</strong></div></div><div className="event-fact"><Icon name="pin" size={25} /><div><small>{text.where}</small><strong>{spanish ? c.venueEs : c.venueEn}</strong></div></div><div className="event-fact"><Icon name="globe" size={25} /><div><small>{text.languages}</small><strong>{text.bothLanguages}</strong></div></div></div>
      <section id="encuentro" className="public-section"><div className="section-two-column"><div><span className="eyebrow">01 &nbsp; / &nbsp; {text.aboutLabel}</span><h2 className="section-title">{text.aboutTitle}</h2></div><p className="body-copy">{spanish ? c.aboutEs : c.aboutEn}</p></div>
        <div className="topic-strip" aria-label={text.topics}>{(spanish ? c.topicsEs : c.topicsEn).map((topic, index) => <div className="topic" key={topic}><Icon name={(['leaf', 'globe', 'book', 'arrow'] as const)[index % 4]} size={21} /><span>{topic}</span></div>)}</div>
      </section>
      <section id="convocatoria" className="call-section"><div><span className="eyebrow">02 &nbsp; / &nbsp; {text.callLabel}</span><h2 className="section-title">{text.callTitle}</h2><Icon name="book" size={47} /></div><div>{scientificCall ? <ScientificCall call={scientificCall} locale={locale} /> : <p className="body-copy">{spanish ? c.callEs : c.callEn}</p>}{adminUrl && <a href={authorUrl} className="button button-outline">{text.myWorks}</a>}<a href={`mailto:${c.contactEmail}?subject=${encodeURIComponent(c.acronym)}`} className="button button-primary">{text.contact}<Icon name="arrow" size={15} /></a></div></section>
      {program&&<Program program={program} locale={locale}/>}
      <section id="sede" className="public-section venue-section"><div><span className="eyebrow">03 &nbsp; / &nbsp; {text.venue}</span><h2 className="section-title">{text.venueTitle}</h2></div><div className="venue-note"><Icon name="pin" size={32} /><p>{spanish ? c.venueEs : c.venueEn}<br /><span className="muted">{dates}</span></p></div></section>
    </main>
    <footer className="public-footer"><div className="footer-main"><Brand /><p>{text.rights}</p></div><div className="footer-bottom"><span>{binding.config ? text.demo : text.platform}</span>{adminUrl && <a href={adminUrl}>{text.administration} ↗</a>}</div></footer>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
  </div>;
}
