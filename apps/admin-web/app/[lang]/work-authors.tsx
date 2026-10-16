'use client';
import { useMemo } from 'react';
import { COUNTRY_CODES, type WorkAuthor } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';

export interface AuthorAccount { id: string; name: string; email?: string; institutions?: string[] }
export function accountAuthor(account: AuthorAccount, corresponding = true): WorkAuthor {
  return {id:crypto.randomUUID(),fullName:account.name,email:account.email??'',corresponding,affiliations:(account.institutions?.length?account.institutions.slice(0,5):['']).map(institution=>({institution,countryCode:''}))};
}
export default function WorkAuthors({ value, onChange, locale, editing, disabled = false, account }: {
  value: WorkAuthor[]; onChange: (authors: WorkAuthor[]) => void; locale: Locale; editing: boolean; disabled?: boolean; account?: AuthorAccount;
}) {
  const text = webCopy[locale];
  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: 'region' });
    return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);
  const country = (code: string) => countries.find((item) => item.code === code)?.name ?? code;
  function change(id: string, patch: Partial<WorkAuthor>) { onChange(value.map((author) => author.id === id ? { ...author, ...patch } : author)); }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction; if (target < 0 || target >= value.length) return;
    const next = [...value]; [next[index], next[target]] = [next[target], next[index]]; onChange(next);
  }
  if (!editing) return <section className="work-section"><h3>{text.workAuthors}</h3>{!value.length ? <p className="muted">{text.noDeclaredAuthors}</p> : <ol className="work-author-list">{value.map((author,index) => <li key={author.id} className="work-author-card">
    <span className="work-author-number" aria-hidden="true">{index+1}</span><div className="work-author-info"><div className="work-author-heading"><strong>{author.fullName}</strong>{author.corresponding && <span className="work-corresponding">{text.correspondingAuthor}</span>}</div>
    {author.email && <a className="work-author-email" href={`mailto:${author.email}`}>{author.email}</a>}
    <ul className="work-affiliations">{author.affiliations.map((affiliation, index) => <li key={index}>{affiliation.institution}<span> · {country(affiliation.countryCode)}</span></li>)}</ul></div>
  </li>)}</ol>}</section>;
  return <section>
    {account && <div className="work-self-author"><p>{text.accountAuthorHelp}</p><button className="button button-outline" type="button" disabled={disabled || value.length>=20 || value.some(author=>author.fullName===account.name && (!account.email||author.email===account.email))} onClick={()=>onChange([...value,accountAuthor(account,value.length===0)])}>{text.addMyselfAuthor}</button></div>}
    <div className="panel-heading"><h3>{text.workAuthors}</h3><button className="button button-outline" type="button" disabled={disabled || value.length >= 20} onClick={() => onChange([...value, { id: crypto.randomUUID(), fullName: '', email: '', corresponding: value.length === 0, affiliations: [{ institution: '', countryCode: '' }] }])}>{text.addWorkAuthor}</button></div>
    <p className="muted small">{text.workAuthorsHelp}</p>{!value.length && <p className="muted">{text.noDeclaredAuthors}</p>}
    {value.map((author, authorIndex) => <article className="panel form-panel" key={author.id} style={{ marginBottom: '1rem' }}>
      <div className="panel-heading"><h4>{text.workAuthor} {authorIndex + 1}</h4><div className="editor-actions">
        <button className="button button-outline" type="button" disabled={disabled || authorIndex === 0} aria-label={`${text.authorMoveUp}: ${author.fullName || authorIndex + 1}`} onClick={() => move(authorIndex, -1)}>{text.authorMoveUp}</button>
        <button className="button button-outline" type="button" disabled={disabled || authorIndex === value.length - 1} aria-label={`${text.authorMoveDown}: ${author.fullName || authorIndex + 1}`} onClick={() => move(authorIndex, 1)}>{text.authorMoveDown}</button>
        <button className="button button-outline" type="button" disabled={disabled} onClick={() => onChange(value.filter((item) => item.id !== author.id))}>{text.removeWorkAuthor}</button>
      </div></div>
      <div className="form-fields"><label className="field"><span>{text.authorFullName}</span><input required minLength={2} maxLength={150} value={author.fullName} disabled={disabled} onChange={(e) => change(author.id, { fullName: e.target.value })} /></label>
        <label><input type="radio" name="corresponding-author" required checked={author.corresponding} disabled={disabled} onChange={() => onChange(value.map((item) => ({ ...item, corresponding: item.id === author.id })))} /> {text.correspondingAuthor}</label>
        <label className="field"><span>{author.corresponding ? text.correspondingEmail : text.optionalAuthorEmail}</span><input type="email" required={author.corresponding} maxLength={254} value={author.email} disabled={disabled} onChange={(e) => change(author.id, { email: e.target.value })} /></label>
        <h4>{text.authorAffiliations}</h4>
        {author.affiliations.map((affiliation, affiliationIndex) => <div key={affiliationIndex} className="form-fields">
          <div className="field-row"><label className="field"><span>{text.authorInstitution}</span><input required minLength={2} maxLength={250} value={affiliation.institution} disabled={disabled} onChange={(e) => change(author.id, { affiliations: author.affiliations.map((item, index) => index === affiliationIndex ? { ...item, institution: e.target.value } : item) })} /></label>
          <label className="field"><span>{text.authorCountry}</span><select required value={affiliation.countryCode} disabled={disabled} onChange={(e) => change(author.id, { affiliations: author.affiliations.map((item, index) => index === affiliationIndex ? { ...item, countryCode: e.target.value } : item) })}><option value="">{text.selectAuthorCountry}</option>{countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label></div>
          <button className="button button-outline" type="button" disabled={disabled || author.affiliations.length <= 1} onClick={() => change(author.id, { affiliations: author.affiliations.filter((_, index) => index !== affiliationIndex) })}>{text.removeAffiliation}</button>
        </div>)}
        <button className="button button-outline" type="button" disabled={disabled || author.affiliations.length >= 5} onClick={() => change(author.id, { affiliations: [...author.affiliations, { institution: '', countryCode: '' }] })}>{text.addAffiliation}</button>
      </div>
    </article>)}
    <p className="muted small">{text.declaredAuthorsHelp}</p>
  </section>;
}
