import { webCopy, type Locale } from '@sep/i18n';
import { Icon } from '@sep/ui';

export default function SignInButtons({ locale, returnTo, googleEnabled }: { locale: Locale; returnTo: string; googleEnabled: boolean }) {
  const text = webCopy[locale];
  return <div className="sso-buttons"><form action="/api/auth/start" method="POST"><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="provider" value="reduniv" /><button className="button button-primary">{text.institutionalLogin}<Icon name="arrow" size={16} /></button></form>
    {googleEnabled && <form action="/api/auth/start" method="POST"><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="provider" value="google" /><button className="button button-outline">{text.googleLogin}<Icon name="arrow" size={16} /></button></form>}
  </div>;
}
