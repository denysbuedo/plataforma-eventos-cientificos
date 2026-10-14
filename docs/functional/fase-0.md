# Fase 0: fundaciones y aislamiento

Estado: plan pendiente de implementación. Esta entrega prepara la estructura y documentación.

## Objetivo

Obtener una API mínima que demuestre contextos independientes y permisos diferentes para una misma persona, con evidencia automática de aislamiento. No incluye recepción de trabajos, revisión, certificados, memorias ni portales completos.

## Secuencia de trabajo

1. Definir términos, relaciones e invariantes; elaborar C4 de contexto y contenedores y mapa de módulos.
2. Redactar ADR-001 de arquitectura, ADR-002 de tenancy y ADR-003 de ORM/aislamiento. La elección de ORM requiere una prueba técnica.
3. Diseñar el modelo mínimo: organizaciones, series, ediciones, eventos, dominios, personas, identidades, afiliaciones, membresías y asignaciones de roles. Resolver primero las cardinalidades pendientes.
4. Definir matriz de permisos, resolución segura de dominio, proxy confiable, errores, auditoría y contratos OpenAPI `/api/v1`.
5. Inicializar el monorepo de TypeScript y la API NestJS; fijar versiones verificadas, gestor de paquetes y scripts reales.
6. Implementar migraciones, datos ficticios, salud y operaciones mínimas de eventos; añadir controles de autorización y aislamiento.
7. Incorporar CI con lint, typecheck y pruebas pertinentes; documentar ejecución local sin Docker obligatorio.
8. Presentar evidencia y cerrar la fase antes de comenzar Fase 1.

## Escenario mínimo de validación

- Organización A: eventos A1 y A2.
- Organización B: evento B1.
- Dominios simulados registrados para los contextos de prueba.
- Una persona con roles distintos en eventos diferentes.
- Un operador con acceso exclusivo a A1 y un usuario sin pertenencia.
- Datos exclusivamente ficticios.

## Criterios de aceptación

- El contexto procede de dominios registrados y de autenticación/autorización del servidor.
- Cada operación comprueba la correspondencia entre organización, evento y recurso.
- Las pruebas rechazan cruces entre organizaciones y entre eventos de una misma organización.
- Cambiar UUID, URL, cabeceras, cuerpo o parámetros no permite acceder a información privada ajena.
- Los roles se aplican por contexto, sin acumulación de privilegios entre eventos.
- Los hosts desconocidos y las cabeceras de proxy no confiables se rechazan o ignoran según la política documentada.
- El contrato OpenAPI describe entradas, salidas, errores y autorización de las operaciones implementadas.
- La documentación permite migrar, cargar datos ficticios, arrancar y ejecutar las pruebas con comandos comprobados.

Las pruebas de archivos, colas, webhooks y reportes se añadirán cuando esas superficies existan; cada una debe conservar los mismos límites de aislamiento.
