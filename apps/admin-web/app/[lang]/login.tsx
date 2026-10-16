'use client';
import { useState } from 'react';
import { Brand, Icon, ScienceArt } from '@sep/ui';
import { webCopy, type Locale } from '@sep/i18n';
import SignInButtons from './sign-in-buttons';
export default function Login({ locale, publicUrl, enabled, institutional = false, googleEnabled = false, redunivEnabled = false, returnTo = '/es', authError = false, logoutError = false }: { locale: Locale; publicUrl: string; enabled: boolean; institutional?: boolean; googleEnabled?: boolean; redunivEnabled?: boolean; returnTo?: string; authError?: boolean; logoutError?: boolean }) {
  const text = webCopy[locale]; const [profile, setProfile] = useState('organizer'); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const options = [
    { id: 'organizer', title: text.organizer, help: text.organizerHelp, persona: 'mixed', event: 'a1', icon: 'edit' as const },
    { id: 'admin', title: text.orgAdmin, help: text.orgAdminHelp, persona: 'admin', event: 'orgA', icon: 'grid' as const },
    { id: 'participant', title: text.participant, help: text.participantHelp, persona: 'mixed', event: 'b1', icon: 'globe' as const },
    { id: 'author', title: text.author, help: text.authorHelp, persona: 'outsider', event: 'a1', icon: 'book' as const },
    { id: 'guest', title: text.guest, help: text.guestHelp, persona: 'outsider', event: 'orgA', icon: 'book' as const },
  ];
  async function login() {
    setLoading(true); setError(''); const chosen = options.find((option) => option.id === profile)!;
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ persona: chosen.persona }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? text.noAuth);
      window.location.assign(returnTo.includes('&tab=works') ? returnTo : `/${locale}?event=${chosen.event}${chosen.id === 'author' ? '&tab=works' : ''}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : text.noAuth); setLoading(false); }
  }
  return <main className="login-page"><section className="login-story"><Brand /><h1>{text.loginTitle}</h1><p>{text.loginSubtitle}</p><ScienceArt theme="forest" /></section>
    <section className="login-access"><div className="language-switch"><a href="/es" className={locale === 'es' ? 'active' : ''}>ES</a><a href="/en" className={locale === 'en' ? 'active' : ''}>EN</a></div>
      <span className="eyebrow">{institutional ? text.externalAccess : text.demoAccess}</span><h2>{text.loginCard}</h2><p className="muted small">{institutional ? text.internationalLoginHelp : enabled ? text.loginHelp : text.noAuth}</p>
      {authError && <div className="notice notice-error" role="alert">{text.loginFailed}</div>}
      {logoutError && <div className="notice notice-error" role="alert">{text.centralLogoutFailed}</div>}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {institutional ? <SignInButtons locale={locale} returnTo={returnTo} googleEnabled={googleEnabled} redunivEnabled={redunivEnabled} /> : <><div className="profile-options" role="radiogroup" aria-label={text.loginHelp}>{options.map((option) => <button type="button" role="radio" aria-checked={profile === option.id} className={`profile-option ${profile === option.id ? 'selected' : ''}`} key={option.id} onClick={() => setProfile(option.id)} disabled={!enabled}><Icon name={option.icon} /><span><strong>{option.title}</strong><small>{option.help}</small></span><span className="radio" /></button>)}</div>
      <button className="button button-primary" onClick={login} disabled={loading || !enabled}>{loading ? text.saving : text.enter}<Icon name="arrow" size={16} /></button></>}
      <a className="login-back" href={`${publicUrl}/${locale}`}><Icon name="globe" size={14} />{text.backPublic}</a>{!institutional && <p className="demo-note">{text.demo}</p>}
    </section></main>;
}
