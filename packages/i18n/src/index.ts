const messages = {
  es: {
    UNAUTHORIZED: 'Se requiere autenticación válida.',
    FORBIDDEN: 'No tienes permiso para realizar esta operación.',
    NOT_FOUND: 'Recurso no encontrado.',
    INVALID_HOST: 'Dominio no permitido.',
    UNTRUSTED_CONTEXT: 'El contexto no puede establecerse mediante cabeceras del cliente.',
    VALIDATION_FAILED: 'La solicitud contiene datos no válidos.',
    CONFLICT: 'El estado del recurso no permite esta operación.',
    REVISION_CONFLICT: 'Los datos cambiaron. Recarga la página antes de guardar.',
    EVENT_DATES_REQUIRED: 'Configura las fechas de inicio y cierre antes de programar el evento.',
    CALL_INCOMPLETE: 'Completa los títulos e instrucciones en ambos idiomas, los plazos, al menos un área y un tipo de contribución antes de publicar.',
    CALL_SITE_REQUIRED: 'Publica primero el sitio del evento desde Contenido o Datos del evento.',
    WORKS_UNAVAILABLE: 'No puedes crear o editar borradores: comprueba que haya convocatoria publicada, plazo vigente y evento activo.',
    WORK_LIMIT: 'Has alcanzado el máximo de 50 borradores en este evento.',
    WORK_REQUIREMENTS: 'El resumen o las palabras clave superan el máximo permitido por el tipo de contribución.',
    DOMAIN_UNAVAILABLE: 'No se pudo registrar el dominio. Comprueba el evento, la disponibilidad del nombre y el límite de 100 dominios.',
    DOMAIN_DNS_PENDING: 'No se encontró el registro TXT esperado. Comprueba el valor y espera la propagación DNS.',
    DOMAIN_TLS_PENDING: 'El dominio necesita verificación DNS y preparación HTTPS antes de activarse.',
    DATABASE_UNAVAILABLE: 'El servicio de datos no está disponible.',
    INTERNAL_ERROR: 'No se pudo completar la solicitud.',
  },
  en: {
    UNAUTHORIZED: 'Valid authentication is required.',
    FORBIDDEN: 'You do not have permission to perform this operation.',
    NOT_FOUND: 'Resource not found.',
    INVALID_HOST: 'Domain is not allowed.',
    UNTRUSTED_CONTEXT: 'Client headers cannot establish the security context.',
    VALIDATION_FAILED: 'The request contains invalid data.',
    CONFLICT: 'The resource state does not allow this operation.',
    REVISION_CONFLICT: 'The data changed. Reload the page before saving.',
    EVENT_DATES_REQUIRED: 'Set the start and end dates before scheduling the event.',
    CALL_INCOMPLETE: 'Complete titles and instructions in both languages, dates, at least one track and one contribution type before publishing.',
    CALL_SITE_REQUIRED: 'Publish the event website from Content or Event details first.',
    WORKS_UNAVAILABLE: 'Draft creation or editing is unavailable. A published call, a valid deadline and an active event are required.',
    WORK_LIMIT: 'You have reached the limit of 50 drafts in this event.',
    WORK_REQUIREMENTS: 'The abstract or keywords exceed the maximum allowed for this contribution type.',
    DOMAIN_UNAVAILABLE: 'Could not register the domain. Check the event, hostname availability and the limit of 100 domains.',
    DOMAIN_DNS_PENDING: 'The expected TXT record was not found. Check its value and allow time for DNS propagation.',
    DOMAIN_TLS_PENDING: 'DNS verification and HTTPS provisioning are required before activation.',
    DATABASE_UNAVAILABLE: 'The data service is unavailable.',
    INTERNAL_ERROR: 'The request could not be completed.',
  },
} as const;

export type ErrorCode = keyof typeof messages.es;
export type Locale = keyof typeof messages;
export function localeFromHeader(header: string | undefined): Locale {
  const candidates = (header ?? '').split(',').map((part, index) => {
    const [language, quality] = part.trim().split(';');
    const q = quality?.startsWith('q=') ? Number(quality.slice(2)) : 1;
    return { language: language.toLowerCase().split('-')[0], q, index };
  }).filter((item) => Number.isFinite(item.q) && item.q > 0 && item.q <= 1)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return candidates.find((item) => item.language === 'es' || item.language === 'en')?.language as Locale ?? 'es';
}
export const errorMessage = (code: ErrorCode, locale: Locale) => messages[locale][code];
export { webCopy, type WebCopy } from './web.js';
