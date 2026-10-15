const messages = {
  es: {
    UNAUTHORIZED: 'Se requiere autenticación válida.',
    FORBIDDEN: 'No tienes permiso para realizar esta operación.',
    NOT_FOUND: 'Recurso no encontrado.',
    INVALID_HOST: 'Dominio no permitido.',
    UNTRUSTED_CONTEXT: 'El contexto no puede establecerse mediante cabeceras del cliente.',
    VALIDATION_FAILED: 'La solicitud contiene datos no válidos.',
    CONFLICT: 'El estado del recurso no permite esta operación.',
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
