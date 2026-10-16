import AuthorshipNav from './authorship-nav';
import type { AuthorAccount } from '@sep/contracts';
import { webCopy,type Locale } from '@sep/i18n';
import { Brand } from '@sep/ui';
import Image from 'next/image';
import ResearcherDetails from './researcher-profile';
export default function Profile({person,locale,contextKey,error,eventId}:{person:AuthorAccount;locale:Locale;contextKey:string;error:boolean;eventId?:string|null}){
  const text=webCopy[locale];const back=`/${locale}?event=${encodeURIComponent(contextKey)}&tab=works`;
  return <div className="admin-shell"><aside className="sidebar"><Brand compact/><nav><a href={back}>{text.myWorks}</a>{eventId&&<a href={`/${locale}?event=${encodeURIComponent(contextKey)}&tab=authorship`}><AuthorshipNav eventId={eventId} contextKey={contextKey} locale={locale}/></a>}<a className="active" href={`/${locale}?event=${encodeURIComponent(contextKey)}&tab=profile`}>{text.myProfile}</a></nav></aside>
    <div className="admin-area"><header className="admin-topbar"><strong>{text.myProfile}</strong><span>{person.name}</span></header><main className="admin-main">
      <div className="admin-heading"><div><h1>{text.myProfile}</h1><p>{text.orcidProfileHelp}</p></div></div>
      {error&&<p className="notice notice-error" role="alert">{text.orcidConnectError}</p>}
      <ResearcherDetails key={person.researcherProfile?.revision??0} initial={person.researcherProfile??{name:person.name,affiliations:[],discoverable:false,revision:0}} locale={locale} contextKey={contextKey}/>
      <section className="panel form-panel work-content"><div><span className="eyebrow">{text.author}</span><h2>{person.name}</h2>{person.email&&<p>{person.email}</p>}</div>
        <section className="work-section"><h3>ORCID</h3>{person.orcid?<><a className="orcid-link" href={`https://${person.orcid.environment==='sandbox'?'sandbox.':''}orcid.org/${person.orcid.id}`} target="_blank" rel="noopener noreferrer"><Image src="/orcid-id.png" alt="ORCID iD" width={16} height={16}/>{person.orcid.id}</a><p className="notice notice-muted">{person.orcid.environment==='sandbox'?text.orcidSandbox:text.orcidConnected}</p></>:<><p>{text.orcidNotConnected}</p>{person.orcidAvailable?<form method="post" action={`/api/auth/orcid/start?event=${encodeURIComponent(contextKey)}&lang=${locale}`}><button className="button button-primary" type="submit"><Image src="/orcid-id.png" alt="" width={16} height={16}/>{text.connectOrcid}</button></form>:<p className="notice notice-muted">{text.orcidNotConfigured}</p>}</>}
        <p className="muted small">{text.orcidIdentityHelp}</p></section>
      </section>
    </main></div></div>;
}
