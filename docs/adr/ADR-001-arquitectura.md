# ADR-001: monolito modular y contratos API

Estado: aceptado como base ya establecida en el proyecto técnico; implementación pendiente.

Fecha: 14 de octubre de 2026.

## Contexto

SEP necesita procesos científicos, operativos y editoriales independientes, identidad compartida y despliegue autohospedable. El equipo y la carga del piloto aún no están dimensionados. El proyecto técnico establece TypeScript, NestJS, Next.js y PostgreSQL como base.

## Alternativas

| Alternativa | Evaluación |
|---|---|
| Monolito sin límites internos | Inicio sencillo, pero dificulta permisos, pruebas y evolución por dominio. |
| Microservicios desde el inicio | Añade despliegues, consistencia distribuida y operación sin necesidad demostrada. |
| Monolito modular con API | Mantiene transacciones locales y una operación inicial manejable, con límites explícitos. |

## Decisión

Usar un monolito modular NestJS con API REST `/api/v1` documentada mediante OpenAPI. Los clientes Next.js y futuros clientes móviles consumen esa API. Ningún frontend accede directamente a PostgreSQL.

Cada módulo es propietario de sus escrituras y expone servicios de aplicación o contratos internos. Otro módulo no importa sus repositorios ni consulta sus tablas privadas. Las relaciones de integridad entre módulos se acuerdan en el modelo; no autorizan acceso directo desde consumidores. Las dependencias deben ser acíclicas.

La primera implementación comprende plataforma, identidad, eventos y autorización. Los contratos públicos no exponen entidades del ORM. Las operaciones transaccionales que produzcan trabajo asíncrono usarán Outbox; no se requiere activar Redis ni workers para una API de salud sin tareas asíncronas.

El despliegue objetivo conserva VMs Ubuntu, proxy y systemd. Workers de documentos y medios podrán ejecutarse por separado cuando existan sus funcionalidades. Docker y Kubernetes no son requisitos.

## Consecuencias

- La API y las políticas pueden probarse independientemente del frontend.
- La separación de módulos exige revisar imports y contratos, aunque compartan proceso y base de datos.
- Se mantienen migraciones coordinadas; separar un módulo en servicio requerirá otro ADR y evidencia operativa.
- Versiones de dependencias, gestor de paquetes y ORM se decidirán durante la inicialización y prueba técnica.

## Evidencia requerida

Compilación, comprobación de límites, OpenAPI y pruebas de aplicación cuando exista código. Este ADR no acredita esos resultados.

Referencias: [arquitectura](../architecture/arquitectura.md), [proyecto técnico](../../PROYECTO_TECNICO_INICIAL.md).
