import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const origin = new URL(process.env.SEP_ADMIN_ORIGIN ?? '');
if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Set SEP_ADMIN_ORIGIN to the exact application origin');
if (origin.protocol === 'http:' && !['127.0.0.1', 'localhost'].includes(origin.hostname)) throw new Error('HTTP is only allowed for loopback development');
const environment = process.env.SEP_DEPLOYMENT_ENV ?? 'dev';
if (!['dev', 'test', 'prod'].includes(environment)) throw new Error('SEP_DEPLOYMENT_ENV must be dev, test or prod');
const clientId = process.env.OIDC_CLIENT_ID ?? `sep-admin-${environment}`;
const audience = process.env.OIDC_AUDIENCE ?? 'sep-api';
const configuration = {
  clientId, name: 'Scientific Events Platform', protocol: 'openid-connect', enabled: true,
  publicClient: false, clientAuthenticatorType: 'client-secret', standardFlowEnabled: true,
  implicitFlowEnabled: false, directAccessGrantsEnabled: false, serviceAccountsEnabled: false,
  rootUrl: origin.origin, baseUrl: origin.origin, redirectUris: [`${origin.origin}/api/auth/callback`], webOrigins: [origin.origin],
  attributes: { 'pkce.code.challenge.method': 'S256', 'post.logout.redirect.uris': `${origin.origin}/es##${origin.origin}/en` }, defaultClientScopes: ['profile', 'email', 'roles'],
  protocolMappers: [{ name: 'sep-api-audience', protocol: 'openid-connect', protocolMapper: 'oidc-audience-mapper',
    consentRequired: false, config: { 'included.custom.audience': audience, 'id.token.claim': 'false', 'access.token.claim': 'true' } }],
};
const directory = resolve('.local'); mkdirSync(directory, { recursive: true });
const destination = resolve(directory, 'keycloak-client.json');
writeFileSync(destination, JSON.stringify(configuration, null, 2) + '\n');
writeFileSync(resolve(directory, 'keycloak-client-roles.json'), JSON.stringify([
  { name: 'ROLE_USER', description: 'Acceso general a SEP; los permisos funcionales se asignan dentro del sistema.' },
  { name: 'ROLE_ADMIN', description: 'Acceso general administrativo; no concede automáticamente roles de organización o evento.' },
], null, 2) + '\n');
console.log(`Client configuration written to ${destination}. Review and import into the chosen realm; no server changes were made.`);
