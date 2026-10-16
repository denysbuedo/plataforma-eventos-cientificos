import type { PublishedScientificCall } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';

export default function ScientificCall({ call, locale }: { call: PublishedScientificCall; locale: Locale }) {
  const text = webCopy[locale]; const c = call.content; const spanish = locale === 'es';
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: call.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (name: string) => parts.find((p) => p.type === name)?.value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const status = c.opensOn && today < c.opensOn ? text.callAnnounced : c.closesOn && today > c.closesOn ? text.callClosed : text.callPeriod;
  return <div>
    <h3>{spanish ? c.titleEs : c.titleEn}</h3><p className="body-copy" style={{ whiteSpace: 'pre-wrap' }}>{spanish ? c.instructionsEs : c.instructionsEn}</p>
    <h3>{text.callDates}</h3><p><strong>{status}</strong></p>
    {c.opensOn && c.closesOn && <dl><dt>{text.callOpens}</dt><dd>{date(c.opensOn)}</dd><dt>{text.callCloses}</dt><dd>{date(c.closesOn)}</dd></dl>}
    <p className="small">{text.callDateHelp} <strong>{call.timezone}</strong></p>
    <h3>{text.scientificTracks}</h3><ul>{c.tracks.map((track) => <li key={track.id}>{spanish ? track.nameEs : track.nameEn}</li>)}</ul>
    <h3>{text.contributionTypes}</h3>
    {c.contributionTypes.map((type) => <article key={type.id} style={{ margin: '1.5rem 0' }}><h4>{spanish ? type.nameEs : type.nameEn}</h4><ul>
      <li>{text.callAbstractWords}: {type.abstractMinWords}–{type.abstractMaxWords}</li><li>{text.callKeywords}: {type.keywordsMin}–{type.keywordsMax}</li>
      {type.manuscriptRequired && <li>{text.callManuscript} {type.maxPages}</li>}
    </ul></article>)}
    <p className="small">{text.callSubmissionPending}</p>
  </div>;
}
