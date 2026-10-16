const messages = {
  es: {
    WORK_AUTHOR_MANAGEMENT:'Solo quien creó el trabajo puede modificar la autoría. Tu acceso permite corregir el contenido, gestionar el PDF y reenviar.',WORK_COLLABORATION_TARGET:'La invitación debe corresponder a otro autor de correspondencia vigente. No puedes aceptar tu propia invitación.',WORK_COLLABORATION_EMAIL:'Entra con una cuenta cuyo correo verificado coincida con el destinatario de la invitación.',WORK_COLLABORATION_EXPIRED:'La invitación caducó o fue revocada. Solicita una nueva.',WORK_COLLABORATION_LIMIT:'Se alcanzó el límite de invitaciones de este trabajo.',
    ORCID_UNAVAILABLE:'La conexión con ORCID aún no está configurada.',ORCID_INVALID:'No se pudo verificar el ORCID. Inicia de nuevo la conexión desde tu perfil.',ORCID_CONFLICT:'Este ORCID ya está vinculado. Se requiere revisar las cuentas antes de cambiar la asociación.',ORCID_REQUIRED:'Este evento exige que la cuenta que envía el trabajo tenga ORCID de producción conectado y figure entre sus autores. Conéctalo en Mi perfil y actualiza tu autoría.',
    FINAL_CLASSIFICATION:'La versión final debe conservar el área, tipo e idioma del trabajo aceptado.',
    PDF_INVALID: 'El archivo debe ser un PDF válido, sin cifrado ni contenido activo y de hasta 500 páginas.',
    PDF_INFECTED: 'El antivirus rechazó el archivo.', FILE_SCAN_REQUIRED: 'El servicio antivirus no está disponible o el archivo necesita un escaneo real.',
    PDF_PAGES: 'El manuscrito supera el máximo de páginas de este tipo.', FILE_QUOTA: 'Has alcanzado la cuota de 50 MiB de manuscritos en este evento.',
    FILE_TOO_LARGE: 'El PDF no puede superar 5 MiB.', MANUSCRIPT_REQUIRED: 'Adjunta el manuscrito requerido antes de enviar.',
    SUBMISSION_NOT_OPEN: 'La recepción de trabajos todavía no ha comenzado.', CALL_CHANGED: 'La convocatoria cambió. Actualiza sus reglas y revisa el borrador antes de enviar.',
    VERSION_LIMIT: 'Se alcanzó el máximo de diez versiones oficiales por trabajo.', SELF_DECISION: 'No puedes dictaminar tu propio trabajo.',
    RESPONSE_DEADLINE: 'Indica un plazo de respuesta vigente para correcciones o versión final; para otros estados deja el plazo vacío.',
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
    WORK_REQUIREMENTS: 'El resumen o las palabras clave no cumplen los límites del tipo de contribución.',
    AUTHOR_CORRESPONDENCE: 'Selecciona un único autor de correspondencia e indica su correo de contacto.',
    AUTHOR_AFFILIATION_DUPLICATE: 'Un autor no puede repetir la misma institución y país en sus afiliaciones.',
    DOMAIN_UNAVAILABLE: 'No se pudo registrar el dominio. Comprueba el evento, la disponibilidad del nombre y el límite de 100 dominios.',
    DOMAIN_DNS_PENDING: 'No se encontró el registro TXT esperado. Comprueba el valor y espera la propagación DNS.',
    DOMAIN_TLS_PENDING: 'El dominio necesita verificación DNS y preparación HTTPS antes de activarse.',
    DATABASE_UNAVAILABLE: 'El servicio de datos no está disponible.',
    INTERNAL_ERROR: 'No se pudo completar la solicitud.',
  },
  en: {
    WORK_AUTHOR_MANAGEMENT:'Only the work creator can change authorship. Your access allows content corrections, PDF management and resubmission.',WORK_COLLABORATION_TARGET:'The invitation must refer to another current corresponding author. You cannot accept your own invitation.',WORK_COLLABORATION_EMAIL:'Sign in with an account whose verified email matches the invitation recipient.',WORK_COLLABORATION_EXPIRED:'The invitation expired or was revoked. Request a new one.',WORK_COLLABORATION_LIMIT:'This work has reached the invitation limit.',
    ORCID_UNAVAILABLE:'The ORCID connection has not been configured yet.',ORCID_INVALID:'ORCID could not be verified. Start a new connection from your profile.',ORCID_CONFLICT:'This ORCID is already linked. Account review is required before changing the association.',ORCID_REQUIRED:'This event requires the submitting account to have a connected production ORCID and be listed as an author. Connect it in My profile and update your authorship.',
    FINAL_CLASSIFICATION:'The final version must retain the accepted work track, type and language.',
    PDF_INVALID: 'The file must be a valid, unencrypted PDF without active content and with at most 500 pages.',
    PDF_INFECTED: 'The antivirus rejected the file.', FILE_SCAN_REQUIRED: 'The antivirus service is unavailable or the file requires a real scan.',
    PDF_PAGES: 'The manuscript exceeds the page limit for this type.', FILE_QUOTA: 'You have reached the 50 MiB manuscript quota for this event.',
    FILE_TOO_LARGE: 'The PDF cannot exceed 5 MiB.', MANUSCRIPT_REQUIRED: 'Attach the required manuscript before submitting.',
    SUBMISSION_NOT_OPEN: 'Submission reception has not started yet.', CALL_CHANGED: 'The call changed. Update its rules and review your draft before submitting.',
    VERSION_LIMIT: 'The limit of ten official versions per work was reached.', SELF_DECISION: 'You cannot issue a decision on your own work.',
    RESPONSE_DEADLINE: 'Set a current response deadline for corrections or the final version; leave it empty for other states.',
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
    WORK_REQUIREMENTS: 'The abstract or keywords do not meet the limits for this contribution type.',
    AUTHOR_CORRESPONDENCE: 'Select exactly one corresponding author and provide their contact email.',
    AUTHOR_AFFILIATION_DUPLICATE: 'An author cannot repeat the same institution and country in their affiliations.',
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
