'use client';
import { useState } from 'react';
import { Brand, Icon, ScienceArt } from '@sep/ui';
import { webCopy, type Locale } from '@sep/i18n';
import SignInButtons from './sign-in-buttons';
export default function Login({ locale, publicUrl, enabled, preserveContext=false, accounts=[], institutional = false, googleEnabled = false, redunivEnabled = false, returnTo = '/es', authError = false, authReference, logoutError = false }: { locale: Locale; publicUrl: string; enabled: boolean; preserveContext?:boolean; accounts?:{id:string;name:string}[]; institutional?: boolean; googleEnabled?: boolean; redunivEnabled?: boolean; returnTo?: string; authError?: boolean; authReference?: string; logoutError?: boolean }) {
  const text = webCopy[locale]; const [profile, setProfile] = useState(accounts[0]?.id??'mixed'); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const options=accounts.length?accounts:[{id:'mixed',name:locale==='es'?'Cuenta de demostración principal':'Main demonstration account'},{id:'admin',name:locale==='es'?'Administración de demostración':'Demonstration administration'},{id:'outsider',name:locale==='es'?'Cuenta de autor de demostración':'Demonstration author account'},{id:'reviewer',name:text.demoReviewer1},{id:'reviewer2',name:text.demoReviewer2}];
  async function login() {
    setLoading(true); setError(''); const chosen = options.find((option) => option.id === profile)!;
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ persona: chosen.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? text.noAuth);
      window.location.assign(preserveContext?returnTo:`/${locale}?event=orgA&tab=access`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : text.noAuth); setLoading(false); }
  }
  return <main className="login-page"><section className="login-story"><Brand /><h1>{text.loginTitle}</h1><p>{text.loginSubtitle}</p><ScienceArt theme="forest" /></section>
    <section className="login-access"><div className="language-switch"><a href={`/es${returnTo.includes('?')?returnTo.slice(returnTo.indexOf('?')):''}`} className={locale === 'es' ? 'active' : ''}>ES</a><a href={`/en${returnTo.includes('?')?returnTo.slice(returnTo.indexOf('?')):''}`} className={locale === 'en' ? 'active' : ''}>EN</a></div>
      <span className="eyebrow">{institutional ? text.externalAccess : (locale==='es'?'Cuentas de demostración':'Demonstration accounts')}</span><h2>{text.loginCard}</h2><p className="muted small">{institutional ? text.internationalLoginHelp : enabled ? (locale==='es'?'Selecciona una cuenta de prueba. Los permisos ya están asignados y pueden ser distintos en cada evento.':'Select a test account. Its permissions are already assigned and may differ between events.') : text.noAuth}</p>
      {authError && <div className="notice notice-error" role="alert">{text.loginFailed}{authReference && <p className="small">{locale === 'es' ? 'Referencia' : 'Reference'}: {authReference}</p>}</div>}
      {logoutError && <div className="notice notice-error" role="alert">{text.centralLogoutFailed}</div>}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {institutional ? <SignInButtons locale={locale} returnTo={returnTo} googleEnabled={googleEnabled} redunivEnabled={redunivEnabled} /> : <><div className="profile-options" role="radiogroup" aria-label={locale==='es'?'Cuenta de prueba':'Test account'}>{options.map((option) => <button type="button" role="radio" aria-checked={profile === option.id} className={`profile-option ${profile === option.id ? 'selected' : ''}`} key={option.id} onClick={() => setProfile(option.id)} disabled={!enabled||loading}><Icon name="book" /><span><strong>{option.name}</strong><small>{locale==='es'?'Cuenta independiente · Permisos por organización y evento':'Separate account · Permissions per organization and event'}</small></span><span className="radio" /></button>)}</div>
      <button className="button button-primary" onClick={login} disabled={loading || !enabled}>{loading ? text.saving : text.enter}<Icon name="arrow" size={16} /></button></>}
      <a className="login-back" href={`${publicUrl}/${locale}`}><Icon name="globe" size={14} />{text.backPublic}</a>{!institutional && <p className="demo-note">{text.demo}</p>}
    </section></main>;
}
