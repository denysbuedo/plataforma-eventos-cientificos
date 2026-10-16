import ParticipantShell from './participant-shell';
import type { AuthorAccount } from '@sep/contracts';
import { webCopy, type Locale } from '@sep/i18n';
import { Icon } from '@sep/ui';
import Image from 'next/image';
import ResearcherDetails from './researcher-profile';
import { profileCopy } from './profile-copy';
export default function Profile({person,locale,contextKey,error,eventId,publicUrl}:{person:AuthorAccount;locale:Locale;contextKey:string;error:boolean;eventId?:string|null;publicUrl:string}) {
  const text=webCopy[locale], copy=profileCopy[locale];
  const names=person.name.trim().split(/\s+/u);
  const initials=[names[0],...(names.length>1?[names.at(-1)!]:[])].map(name=>Array.from(name)[0]??'').join('').toLocaleUpperCase(locale);
  const status=person.orcid?person.orcid.environment==='sandbox'?'sandbox':'connected':person.orcidAvailable?'disconnected':'unavailable';
  return <ParticipantShell person={person} locale={locale} contextKey={contextKey} eventId={eventId} tab="profile" publicUrl={publicUrl}>
    <div className="profile-page">
        <div className="admin-heading"><div><h1>{text.myProfile}</h1><p>{copy.intro}</p></div></div>
        {error&&<p className="notice notice-error" role="alert">{text.orcidConnectError}</p>}
        <section className="profile-identity" aria-label={copy.account}><div className="profile-avatar" aria-hidden="true">{initials}</div><div><span className="profile-kicker">{copy.account}</span><h2>{person.name}</h2>{person.email&&<p className="profile-email">{person.email}</p>}</div></section>
        <div className="profile-layout">
          <ResearcherDetails key={person.researcherProfile?.revision??0} initial={person.researcherProfile??{name:person.name,affiliations:[],discoverable:false,revision:0}} locale={locale} contextKey={contextKey}/>
          <aside className="profile-aside" aria-label="ORCID">
            <section className="panel profile-card profile-orcid"><div className="profile-card-heading"><div className="profile-orcid-brand"><Image src="/orcid-id.png" alt="" width={28} height={28}/><h2>ORCID</h2></div><span className={`profile-status profile-status-${status}`}>{copy[status]}</span></div>
              <p className="profile-help">{person.orcid?copy.orcidLinkedHelp:copy.orcidHelp}</p>
              {person.orcid?<><a className="orcid-link" href={`https://${person.orcid.environment==='sandbox'?'sandbox.':''}orcid.org/${person.orcid.id}`} target="_blank" rel="noopener noreferrer">{person.orcid.id}<Icon name="external" size={16}/></a><p className="profile-caption">{copy.connectedOn} {new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(person.orcid.connectedAt))}</p>{status==='sandbox'&&<p className="profile-sandbox-note">{copy.sandboxHelp}</p>}</>:<>{person.orcidAvailable?<form method="post" action={`/api/auth/orcid/start?event=${encodeURIComponent(contextKey)}&lang=${locale}`}><button className="button button-primary" type="submit">{text.connectOrcid}<Icon name="external" size={16}/></button></form>:<p className="profile-activation-note">{copy.unavailableHelp}</p>}</>}
              <p className="profile-orcid-footnote">{copy.orcidNote}</p>
            </section>
            <section className="profile-privacy-note"><span className="profile-note-icon"><Icon name="lock" size={20}/></span><div><h2>{copy.privacy}</h2><p>{copy.privacyHelp}</p><p>{copy.copiesHelp}</p></div></section>
          </aside>
        </div>
    </div>
  </ParticipantShell>;
}
