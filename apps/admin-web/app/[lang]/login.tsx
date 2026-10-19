'use client';
import { useState } from 'react';
import { Brand, Icon, ScienceArt } from '@sep/ui';
import { webCopy, type Locale } from '@sep/i18n';
import SignInButtons from './sign-in-buttons';
import { authCopy } from './auth-copy';
import LocalCredentials,{type LocalAuthMode} from './local-credentials';
export default function Login({ locale, publicUrl, enabled, preserveContext=false, accounts=[], institutional = false, googleEnabled = false, redunivEnabled = false, returnTo = '/es', authError = false, authReference, logoutError = false, register=false,localEnabled=false,mode }: { locale: Locale; publicUrl: string; enabled: boolean; preserveContext?:boolean; accounts?:{id:string;name:string}[]; institutional?: boolean; googleEnabled?: boolean; redunivEnabled?: boolean; returnTo?: string; authError?: boolean; authReference?: string; logoutError?: boolean; register?: boolean; localEnabled?:boolean;mode?:string }) {
  const text = webCopy[locale]; const [profile, setProfile] = useState(accounts[0]?.id??'mixed'); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const copy=authCopy[locale],registration=register&&institutional;
  const localMode:LocalAuthMode=localEnabled&&['forgot','verify','reset'].includes(mode??'')?mode as LocalAuthMode:registration?'register':'login';
  const providers=localMode==='login'||localMode==='register';
  const localHeadings=locale==='es'?{forgot:'Recuperar contraseña',verify:'Confirma tu correo',reset:'Nueva contraseña'}:{forgot:'Reset your password',verify:'Verify your email',reset:'New password'};
  function modeHref(language:Locale,create:boolean){const query=new URL(returnTo,'http://sep.invalid').searchParams;if(create)query.set('mode','register');else query.delete('mode');return `/${language}${query.size?'?'+query:''}`;}
  const registrationDestination=new URL(returnTo,'http://sep.invalid');registrationDestination.searchParams.set('tab','profile');
  const destination=registration?registrationDestination.pathname+registrationDestination.search:returnTo;
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
  return <main className={`login-page${institutional?' login-compact':''}`} data-auth-mode={localMode}><section className="login-story"><Brand /><div className="login-story-copy"><span className="eyebrow">{copy.community}</span><h1>{copy.title}</h1><p>{copy.story}</p></div><ScienceArt theme="forest" /><p className="login-story-footer">{copy.storyFooter}</p></section>
    <section className="login-access"><nav className="language-switch" aria-label={copy.language}><a href={modeHref('es',registration)} className={locale === 'es' ? 'active' : ''} aria-current={locale==='es'?'page':undefined} lang="es">ES</a><a href={modeHref('en',registration)} className={locale === 'en' ? 'active' : ''} aria-current={locale==='en'?'page':undefined} lang="en">EN</a></nav>
    <div className="login-content">
      {!institutional&&<span className="eyebrow">{locale==='es'?'Cuentas de demostración':'Demonstration accounts'}</span>}
      <h2>{!providers?localHeadings[localMode as 'forgot'|'verify'|'reset']:institutional?(registration?copy.register:copy.login):text.loginCard}</h2><p className="login-intro">{!providers?(locale==='es'?'Gestiona el acceso a tu cuenta local de SEP.':'Manage access to your local SEP account.'):institutional?(localEnabled?(registration?(locale==='es'?'Crea tu cuenta con tu correo o con uno de estos servicios.':'Create your account with your email or one of these services.'):(locale==='es'?'Entra con tu correo y contraseña o utiliza otra forma de acceso.':'Sign in with your email and password or use another sign-in method.')):(registration?copy.registerHelp:copy.loginHelp)):enabled?(locale==='es'?'Selecciona una cuenta para explorar la demostración.':'Select an account to explore the demonstration.'):text.noAuth}</p>
      {authError && <div className="notice notice-error" role="alert">{text.loginFailed}{authReference && <p className="small">{locale === 'es' ? 'Referencia' : 'Reference'}: {authReference}</p>}</div>}
      {logoutError && <div className="notice notice-error" role="alert">{text.centralLogoutFailed}</div>}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {institutional ? <>{localEnabled&&<LocalCredentials key={localMode} locale={locale} mode={localMode} returnTo={destination}/>} {providers&&<>{localEnabled&&<div className="auth-divider"><span>{locale==='es'?'o continúa con':'or continue with'}</span></div>}<SignInButtons locale={locale} returnTo={destination} googleEnabled={googleEnabled} redunivEnabled={redunivEnabled} register={registration}/>{registration&&!localEnabled&&<p className="auth-registration-note">{copy.registrationNote}</p>}<p className="auth-account-switch">{registration?copy.existingAccount:copy.newAccount} <a href={modeHref(locale,!registration)}>{registration?copy.login:copy.register}</a></p></>}</> : <><div className="profile-options" role="radiogroup" aria-label={locale==='es'?'Cuenta de prueba':'Test account'}>{options.map((option) => <button type="button" role="radio" aria-checked={profile === option.id} className={`profile-option ${profile === option.id ? 'selected' : ''}`} key={option.id} onClick={() => setProfile(option.id)} disabled={!enabled||loading}><Icon name="book" /><span><strong>{option.name}</strong><small>{locale==='es'?'Cuenta de demostración':'Demonstration account'}</small></span><span className="radio" /></button>)}</div>
      <button className="button button-primary" onClick={login} disabled={loading || !enabled}>{loading ? text.saving : text.enter}<Icon name="arrow" size={16} /></button></>}
      {publicUrl&&<a className="login-back" href={`${publicUrl}/${locale}`}><Icon name="globe" size={14} />{text.backPublic}</a>}{!institutional && <p className="demo-note">{text.demo}</p>}
    </div></section></main>;
}
