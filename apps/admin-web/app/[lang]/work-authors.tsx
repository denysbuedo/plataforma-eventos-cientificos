'use client';
import { useEffect,useMemo,useRef,useState } from 'react';
import Image from 'next/image';
import {feedbackCopy} from './work-feedback-copy';
import { COUNTRY_CODES, validOrcid, type WorkAuthor, type OrcidConnection, type ResearcherProfile, type ResearcherCandidate } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';

export interface AuthorAccount { id: string; name: string; email?: string; institutions?: string[]; orcid?:OrcidConnection|null; orcidAvailable?:boolean; researcherProfile?:ResearcherProfile }
export function accountAuthor(account: AuthorAccount, corresponding = true): WorkAuthor {
  return {id:crypto.randomUUID(),personId:account.id,authorshipConfirmed:true,orcid:account.orcid?.id??'',fullName:account.name,email:account.email??'',corresponding,affiliations:account.researcherProfile?.affiliations.length?account.researcherProfile.affiliations.map(item=>({...item})):(account.institutions?.length?account.institutions.slice(0,5):['']).map(institution=>({institution,countryCode:''}))};
}
export default function WorkAuthors({ value, onChange, locale, editing, disabled = false, account,contextKey }: {
  value: WorkAuthor[]; onChange: (authors: WorkAuthor[]) => void; locale: Locale; editing: boolean; disabled?: boolean; account?: AuthorAccount; contextKey?:string;
}) {
  const text = webCopy[locale], copy=feedbackCopy[locale];
  const [finding,setFinding]=useState(false);const [query,setQuery]=useState('');const [results,setResults]=useState<ResearcherCandidate[]|null>(null);const [searching,setSearching]=useState(false);const [error,setError]=useState('');const searchController=useRef<AbortController|null>(null);
  const [findingFor,setFindingFor]=useState<string|null>(null);
  useEffect(()=>()=>searchController.current?.abort(),[]);
  useEffect(()=>{if(!finding)return;const frame=requestAnimationFrame(()=>{const input=document.getElementById('researcher-search-input');input?.scrollIntoView({block:'nearest'});input?.focus({preventScroll:true});});return()=>cancelAnimationFrame(frame);},[finding,findingFor]);
  function closeSearch(){searchController.current?.abort();setFinding(false);setFindingFor(null);setSearching(false);setError('');setResults(null);}
  function startSearch(author?:WorkAuthor){searchController.current?.abort();setFindingFor(author?.id??null);setFinding(true);setSearching(false);setQuery(author?.fullName??'');setResults(null);setError('');}
  async function search(){
    if(!contextKey||query.trim().length<3||disabled)return;searchController.current?.abort();const controller=new AbortController();searchController.current=controller;setSearching(true);setResults(null);setError('');
    try{const response=await fetch(`/api/backend/researchers?event=${encodeURIComponent(contextKey)}&lang=${locale}&q=${encodeURIComponent(query.trim())}`,{signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(data.error?.message??text.serviceHelp);if(!controller.signal.aborted)setResults(data);}catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:text.serviceHelp);}finally{if(!controller.signal.aborted)setSearching(false);}
  }
  function addCandidate(candidate:ResearcherCandidate){
    if(value.some(author=>author.personId===candidate.personId&&author.id!==findingFor))return;
    const author=candidate.personId===account?.id?accountAuthor(account,value.length===0):{id:crypto.randomUUID(),personId:candidate.personId,fullName:candidate.name,email:'',corresponding:value.length===0,affiliations:candidate.affiliations.map(item=>({...item})),orcid:candidate.orcid??'',orcidVerified:!!candidate.orcid,authorshipConfirmed:false};
    if(findingFor){if(!value.some(item=>item.id===findingFor)){closeSearch();return;}onChange(value.map(item=>item.id===findingFor?{...author,id:item.id,email:item.email||author.email,corresponding:item.corresponding}:item));}else onChange([...value,author]);closeSearch();
  }
  function addManual(){if(!findingFor)onChange([...value,{id:crypto.randomUUID(),fullName:'',email:'',corresponding:value.length===0,affiliations:[{institution:'',countryCode:''}]}]);closeSearch();}
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
    {author.personId&&<p className="muted small">{author.authorshipConfirmed===false?text.registeredAuthorPending:author.authorshipConfirmed===true?text.registeredAuthorConfirmed:text.registeredAuthorLinked}</p>}
    {author.email && <a className="work-author-email" href={`mailto:${author.email}`}>{author.email}</a>}
    {author.orcid&&<p><a className="orcid-link" href={`https://orcid.org/${author.orcid}`} target="_blank" rel="noopener noreferrer"><Image src="/orcid-id.png" alt="ORCID iD" width={16} height={16}/>{author.orcid}</a> <span className="muted small">({author.orcidVerified?text.orcidVerified:text.orcidDeclared})</span></p>}
    <ul className="work-affiliations">{author.affiliations.map((affiliation, index) => <li key={index}>{affiliation.institution}<span> · {country(affiliation.countryCode)}</span></li>)}</ul></div>
  </li>)}</ol>}</section>;
  return <section className="work-editor-section work-authors-editor">
    {account && !value.some(author=>author.personId===account.id) && <div className="work-self-author"><p>{text.accountAuthorHelp}</p><button className="button button-outline" type="button" disabled={disabled || value.length>=20 || value.some(author=>author.personId===account.id)} onClick={()=>onChange([...value,accountAuthor(account,value.length===0)])}>{text.addMyselfAuthor}</button></div>}
    <div className="panel-heading"><h3>{text.workAuthors}</h3><button className="button button-outline" type="button" disabled={disabled || value.length >= 20} onClick={() => {if(contextKey)startSearch();else addManual();}}>{text.addWorkAuthor}</button></div>
    {finding&&<section className="work-author-search" aria-labelledby="find-author-heading"><div className="work-detail-header"><h4 id="find-author-heading">{text.findRegisteredAuthor}</h4><button className="button button-outline" type="button" disabled={disabled} onClick={closeSearch}>{text.cancel}</button></div><p className="muted small">{text.findRegisteredAuthorHelp}</p>
      <div className="editor-actions"><label className="field"><span>{text.researcherSearchLabel}</span><input id="researcher-search-input" maxLength={100} value={query} disabled={disabled} onChange={event=>{searchController.current?.abort();setSearching(false);setQuery(event.target.value);setResults(null);setError('');}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();void search();}}}/></label><button className="button button-primary" type="button" disabled={disabled||searching||query.trim().length<3} onClick={()=>{void search();}}>{searching?text.searchingResearchers:text.searchResearchers}</button></div>
      {error&&<p className="notice notice-error" role="alert">{error}</p>}<div aria-live="polite">{results&&<><p className="muted small">{results.length?text.researcherResultsHelp:text.noResearchersFound}</p><ul className="work-author-list">{results.map(candidate=><li className="work-author-card" key={candidate.personId}><div className="work-author-info"><strong>{candidate.name}</strong><p className="muted small">{candidate.affiliations.map(item=>`${item.institution} · ${country(item.countryCode)}`).join('; ')}</p>{candidate.orcid&&<a className="orcid-link" href={`https://orcid.org/${candidate.orcid}`} target="_blank" rel="noopener noreferrer"><Image src="/orcid-id.png" alt="ORCID iD" width={16} height={16}/>{candidate.orcid}</a>}</div><button className="button button-outline" type="button" disabled={disabled||!findingFor&&value.length>=20||value.some(author=>author.personId===candidate.personId&&author.id!==findingFor)} onClick={()=>addCandidate(candidate)}>{value.some(author=>author.personId===candidate.personId&&author.id!==findingFor)?text.authorAlreadySelected:text.selectRegisteredAuthor}</button></li>)}</ul></>}</div>
      <p className="muted small">{text.manualAuthorHelp}</p><button className="button button-outline" type="button" disabled={disabled||!findingFor&&value.length>=20} onClick={addManual}>{findingFor?text.keepManualAuthor:text.addManualAuthor}</button>
    </section>}
    <p className="profile-help">{copy.authorEditorHelp}</p>{!value.length && <p className="muted">{text.noDeclaredAuthors}</p>}
    {value.map((author, authorIndex) => <article className="work-author-editor-card" key={author.id}>
      <div className="work-author-editor-heading"><div className="work-author-heading"><span className="work-author-number">{authorIndex+1}</span><h4>{author.fullName||text.workAuthor}</h4><label className="work-corresponding-choice"><input type="radio" name="corresponding-author" required checked={author.corresponding} disabled={disabled} onChange={()=>onChange(value.map(item=>({...item,corresponding:item.id===author.id})))}/>{text.correspondingAuthor}</label></div><div className="editor-actions">
        <button className="button button-outline" type="button" disabled={disabled||authorIndex===0} title={text.authorMoveUp} aria-label={`${text.authorMoveUp}: ${author.fullName||authorIndex+1}`} onClick={()=>move(authorIndex,-1)}>↑</button>
        <button className="button button-outline" type="button" disabled={disabled||authorIndex===value.length-1} title={text.authorMoveDown} aria-label={`${text.authorMoveDown}: ${author.fullName||authorIndex+1}`} onClick={()=>move(authorIndex,1)}>↓</button>
        <button className="button button-outline" type="button" disabled={disabled} onClick={()=>onChange(value.filter(item=>item.id!==author.id))}>{text.removeWorkAuthor}</button>
      </div></div>
      <div className="field-row work-author-primary-fields">
        <label className="field"><span>{text.authorFullName}</span><input required minLength={2} maxLength={150} value={author.fullName} disabled={disabled} onChange={event=>change(author.id,{fullName:event.target.value})}/></label>
        <label className="field"><span>{author.corresponding?text.correspondingEmail:text.optionalAuthorEmail}</span><input type="email" required={author.corresponding} maxLength={254} value={author.email} disabled={disabled} onChange={event=>change(author.id,{email:event.target.value})}/></label>
        <label className="field"><span>ORCID</span><input placeholder="0000-0000-0000-000X" maxLength={19} value={author.orcid??''} disabled={disabled||!!author.personId} onChange={event=>{const orcid=event.target.value.trim().toUpperCase();event.target.setCustomValidity(orcid&&!validOrcid(orcid)?text.orcidInvalidFormat:'');change(author.id,{orcid,orcidVerified:false});}}/></label>
      </div>
      <section className="work-author-affiliations"><div className="work-affiliations-heading"><h5>{text.authorAffiliations}</h5><button className="button button-outline" type="button" disabled={disabled||author.affiliations.length>=5} onClick={()=>change(author.id,{affiliations:[...author.affiliations,{institution:'',countryCode:''}]})}>{text.addAffiliation}</button></div>
        {author.affiliations.map((affiliation,affiliationIndex)=><div key={affiliationIndex} className="work-affiliation-editor"><div className="field-row"><label className="field"><span>{text.authorInstitution}</span><input required minLength={2} maxLength={250} value={affiliation.institution} disabled={disabled} onChange={event=>change(author.id,{affiliations:author.affiliations.map((item,index)=>index===affiliationIndex?{...item,institution:event.target.value}:item)})}/></label><label className="field"><span>{text.authorCountry}</span><select required value={affiliation.countryCode} disabled={disabled} onChange={event=>change(author.id,{affiliations:author.affiliations.map((item,index)=>index===affiliationIndex?{...item,countryCode:event.target.value}:item)})}><option value="">{text.selectAuthorCountry}</option>{countries.map(item=><option key={item.code} value={item.code}>{item.name}</option>)}</select></label></div>{author.affiliations.length>1&&<button className="button button-outline" type="button" disabled={disabled} onClick={()=>change(author.id,{affiliations:author.affiliations.filter((_,index)=>index!==affiliationIndex)})}>{text.removeAffiliation}</button>}</div>)}
      </section>
      <details className="work-author-identity"><summary>{copy.identityTools}{author.personId?` · ${author.authorshipConfirmed===false?copy.authorPending:copy.authorAccount}`:''}</summary><p className="profile-help">{author.personId?text.orcidFromProfile:text.orcidDeclaredHelp}</p><div className="editor-actions">
        {author.personId&&<><p className="profile-help">{author.authorshipConfirmed===false?text.registeredAuthorPending:text.registeredAuthorLinked}</p><button className="button button-outline" type="button" disabled={disabled} onClick={()=>change(author.id,{personId:undefined,orcidVerified:false,authorshipConfirmed:false})}>{text.unlinkDeclaredAuthor}</button></>}
        {!author.personId&&contextKey&&<button className="button button-outline" type="button" disabled={disabled} onClick={()=>startSearch(author)}>{text.findPersonForAuthor}</button>}
        {account&&!author.personId&&!value.some(item=>item.personId===account.id)&&<button className="button button-outline" type="button" disabled={disabled} onClick={()=>change(author.id,{personId:account.id,fullName:account.name,email:account.email||author.email,orcid:account.orcid?.id??'',orcidVerified:account.orcid?.environment==='production'})}>{text.useMyAuthorData}</button>}
      </div></details>
    </article>)}
    <p className="muted small">{text.declaredAuthorsHelp}</p>
  </section>;
}
