import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const origin = new URL(process.env.SEP_ADMIN_ORIGIN ?? '');
if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Set SEP_ADMIN_ORIGIN to the exact application origin');
if (origin.protocol === 'http:' && !['127.0.0.1', 'localhost'].includes(origin.hostname)) throw new Error('HTTP is only allowed for loopback development');
const clientId = process.env.OIDC_CLIENT_ID ?? 'sep-admin';
const audience = process.env.OIDC_AUDIENCE ?? 'sep-api';
const configuration = {
  clientId, name: 'Scientific Events Platform', protocol: 'openid-connect', enabled: true,
  publicClient: false, clientAuthenticatorType: 'client-secret', standardFlowEnabled: true,
  implicitFlowEnabled: false, directAccessGrantsEnabled: false, serviceAccountsEnabled: false,
  rootUrl: origin.origin, baseUrl: origin.origin, redirectUris: [`${origin.origin}/api/auth/callback`], webOrigins: [],
  attributes: { 'pkce.code.challenge.method': 'S256' }, defaultClientScopes: ['profile', 'email'],
  protocolMappers: [{ name: 'sep-api-audience', protocol: 'openid-connect', protocolMapper: 'oidc-audience-mapper',
    consentRequired: false, config: { 'included.custom.audience': audience, 'id.token.claim': 'false', 'access.token.claim': 'true' } }],
};
const directory = resolve('.local'); mkdirSync(directory, { recursive: true });
const destination = resolve(directory, 'keycloak-client.json');
writeFileSync(destination, JSON.stringify(configuration, null, 2) + '\n');
console.log(`Client configuration written to ${destination}. Review and import into the chosen realm; no server changes were made.`);
