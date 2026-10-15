# ADR-004: monorepo inicial y autenticación de desarrollo

Estado: aceptado para desarrollo de Fase 0; no habilita despliegue productivo.

## Contexto

La prueba ORM ya permitió elegir Drizzle. El siguiente incremento necesita endpoints reales, roles consultados en BD, contratos compartidos y pruebas reproducibles. No existe todavía proveedor OIDC institucional ni credenciales de integración.

## Alternativas y decisión

Usar npm workspaces con los paquetes que ya tienen código: API, contratos e idiomas. Evita introducir un orquestador adicional antes de necesitarlo. Los otros directorios permanecen preparados para fases posteriores.

Versiones verificadas por instalación: NestJS 12.1.3, Swagger 12.0.2, Node.js 22.23.2, npm 10.9.2 y TypeScript 6.0.3. NestJS instalado publica módulos ESM, por lo que se compilan estos paquetes como ESM con extensiones de importación explícitas. TypeScript 7 se descartó para el monorepo porque typescript-eslint 8.71.2 declara compatibilidad menor a 6.1; la prueba comparativa anterior conserva su entorno independiente.

Frente a inventar un proveedor OIDC o aceptar IDs/roles en cabeceras, usar una interfaz `Authenticator` con adaptador de tokens opacos efímeros configurados en servidor. Cada token identifica una persona, sin roles. PostgreSQL determina sus asignaciones vigentes por operación. El modo exige configuración explícita y se bloquea fuera de development/test.

No se implementa login, emisión pública de tokens, contraseñas, SSO ni MFA. El adaptador se reemplazará por OIDC antes de un despliegue productivo. La demo genera tokens nuevos por ejecución y solo guarda su configuración en `.local/` ignorado por Git.

## Aislamiento y bootstrap

El registro de organizaciones/dominios no recibe acceso directo desde runtime. Su búsqueda usa una función SQL de coincidencia exacta con `SECURITY DEFINER`, `search_path` fijo y permisos de ejecución restringidos. No usa RLS en esas dos tablas de control; la privacidad depende de los grants y de la función limitada. Las nueve tablas privadas restantes usan RLS/FORCE.

Membresías y roles se consultan dentro de la misma transacción que ejecuta la operación. Los cambios de evento y su auditoría se confirman juntos. El runtime tiene permisos de escritura mínimos y no puede gestionar roles o identidades.

Para evitar afectar bases existentes, tests y demo aprovisionan un cluster nuevo con puerto libre y datos ficticios. Esta instancia local usa trust; no constituye una configuración de operación real.

## Consecuencias

- CI y tests pueden ejecutar HTTP real sin SaaS, Docker ni secretos de terceros.
- No se debe exponer la demo a internet ni presentar el adaptador como autenticación productiva.
- Registro/activación real de dominios, proxy confiable, certificados TLS, auditoría persistente de denegaciones y OIDC quedan pendientes.
- La validación del modelo por el piloto y el cierre formal de Fase 0 siguen pendientes.

Referencias: [guía local](../development/desarrollo-local.md), [contrato API](../api/fase-0.md), [evidencia](../architecture/evidencia-api-fase-0.md).
