import { webCopy, type Locale } from '@sep/i18n';
import Image from 'next/image';
import { useId } from 'react';
import { authCopy } from './auth-copy';

export default function SignInButtons({ locale, returnTo, googleEnabled, redunivEnabled, register=false }: { locale: Locale; returnTo: string; googleEnabled: boolean; redunivEnabled: boolean; register?: boolean }) {
  const text = webCopy[locale],copy=authCopy[locale],id=useId();
  return <div className="sso-buttons">
    <form action="/api/auth/start" method="POST"><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="provider" value="google" />
      <button className="provider-button provider-google" disabled={!googleEnabled} aria-describedby={!googleEnabled?`${id}-google`:undefined}><span className="provider-symbol"><Image src="/identity/google-g.png" alt="" width={20} height={20} unoptimized/></span><span>{register?copy.googleRegister:text.googleLogin}</span></button>
      {!googleEnabled&&<p className="provider-availability" id={`${id}-google`}>{copy.googleUnavailable}</p>}
    </form>
    <form action="/api/auth/start" method="POST"><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="provider" value="reduniv" />
      <button className="provider-button provider-reduniv" disabled={!redunivEnabled} aria-describedby={!redunivEnabled?`${id}-reduniv`:undefined}><span className="provider-symbol"><Image src="/identity/reduniv-logo.png" alt="" width={64} height={26} unoptimized/></span><span>{register?copy.redunivRegister:text.institutionalLogin}</span></button>
      {!redunivEnabled&&<p className="provider-availability" id={`${id}-reduniv`}>{copy.redunivUnavailable}</p>}
    </form>
  </div>;
}
