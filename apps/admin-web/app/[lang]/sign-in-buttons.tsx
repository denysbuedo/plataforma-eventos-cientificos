import { type Locale } from '@sep/i18n';
import Image from 'next/image';
import { useId } from 'react';
import { authCopy } from './auth-copy';

export default function SignInButtons({ locale, returnTo, googleEnabled, redunivEnabled, register=false }: { locale: Locale; returnTo: string; googleEnabled: boolean; redunivEnabled: boolean; register?: boolean }) {
  const copy=authCopy[locale],id=useId();
  return <div className="sso-buttons" data-purpose={register?'register':'login'}>
    <form action="/api/auth/start" method="POST"><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="provider" value="google" />
      <button className="provider-button provider-google" disabled={!googleEnabled} aria-describedby={!googleEnabled?`${id}-google`:undefined}><span className="provider-symbol"><Image src="/identity/google-g.png" alt="" width={18} height={18} unoptimized/></span><span>{locale==='es'?'Continuar con Google':'Continue with Google'}</span></button>
    </form>
    <form action="/api/auth/start" method="POST"><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="provider" value="reduniv" />
      <button className="provider-button provider-reduniv" disabled={!redunivEnabled} aria-describedby={!redunivEnabled?`${id}-reduniv`:undefined}><span className="provider-symbol"><span className="provider-monogram" aria-hidden="true">R</span></span><span>{locale==='es'?'Continuar con RedUniv':'Continue with RedUniv'}</span></button>
    </form>
    {!googleEnabled&&<p className="provider-availability" id={`${id}-google`}>{copy.googleUnavailable}</p>}
    {!redunivEnabled&&<p className="provider-availability" id={`${id}-reduniv`}>{copy.redunivUnavailable}</p>}
  </div>;
}
