import { webCopy, type Locale } from '@sep/i18n';
import { Icon } from '@sep/ui';

export default function SignInButtons({ locale, returnTo, googleEnabled, redunivEnabled }: { locale: Locale; returnTo: string; googleEnabled: boolean; redunivEnabled: boolean }) {
  const text = webCopy[locale];
  return <div className="sso-buttons"><form action="/api/auth/start" method="POST"><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="provider" value="reduniv" /><button className="button button-primary" disabled={!redunivEnabled}>{text.institutionalLogin}<Icon name="arrow" size={16} /></button></form>
    <form action="/api/auth/start" method="POST"><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="provider" value="google" /><button className="button button-outline" disabled={!googleEnabled}>{text.googleLogin}<Icon name="arrow" size={16} /></button></form>
  </div>;
}
