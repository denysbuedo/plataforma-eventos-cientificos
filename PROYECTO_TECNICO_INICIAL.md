---
title: "Plataforma Integral de Gestión de Eventos Científicos"
subtitle: "Informe comparativo, catálogo funcional y propuesta de arquitectura — versión inicial 1.0"
date: "14 de octubre de 2026"
lang: es-ES
---

# Resumen ejecutivo

Se propone desarrollar desde cero una **plataforma integral, multiinstitución, multievento, multiidioma, modular y API-first**, especializada en congresos científicos, convenciones académicas, simposios, talleres, escuelas de verano y eventos de investigación. No se limita a la inscripción y recepción de ponencias: abarcará planificación, convocatoria, revisión, inscripción, organización, celebración, acreditación, certificados, generación de memorias y preservación del patrimonio científico.

Los principios rectores son: (1) cada evento tiene dominio, identidad visual, configuración, comités, formularios y reglas propios; (2) identidad común de personas con permisos independientes por evento; (3) español e inglés desde el inicio; (4) módulos extensibles como hospedaje y transportación; (5) API documentada e independiente del frontend web para soportar futuras APK; (6) galería navegable de pósteres; (7) memorias científicas publicables con metadatos persistentes; (8) credenciales y certificados verificables; (9) soberanía de despliegue y datos; (10) operación adecuada en entornos de conectividad limitada.

**Ciclo de vida:** planificación y creación → gestión científica → organización e inscripción → celebración presencial, virtual o híbrida → acreditación y certificación → publicación y preservación.

Este documento es una propuesta inicial de arquitectura y alcance, no un diseño contractual cerrado. Deben validarse reglas científicas, necesidades editoriales, políticas financieras, capacidad y requisitos legales con los responsables del producto.

# 1. Estudio comparativo de sistemas existentes

## 1.1. Metodología y alcance

Se consideran tres tipos de producto: **código abierto**, desplegable y modificable según licencia; **servicios gratuitos**, que pueden ser propietarios; y **plataformas comerciales**, cuyas capacidades dependen de la edición o contratación. La comparación presenta énfasis funcional documentado, no una certificación de todos los planes ni una prueba práctica de cada flujo.

## 1.2. Soluciones libres y abiertas

### Indico (CERN)

Referente funcional principal para eventos académicos: congresos y reuniones, abstracts y papers, revisión, participantes, registro, cuotas y pagos según configuración, agenda, salas, acreditación y extensibilidad mediante plugins. Lección: modelar el ciclo académico completo y permitir extensiones. Sitios: https://getindico.io/ y https://github.com/indico/indico .

### pretalx

Especialmente sólido en Call for Papers, propuestas, evaluación colaborativa, ponentes, programación, salas, agenda pública y publicación de materiales. Lección: UX de convocatoria, revisión y programación. Sitios: https://pretalx.com/ y https://docs.pretalx.org/ .

### Open Event / eventyay (FOSSASIA)

Gestiona eventos, agendas, sesiones, ponentes, entradas y clientes conectados mediante REST/JSON:API. Lección: contratos abiertos y desacoplamiento de clientes. Código: https://github.com/fossasia/open-event-server .

### pretix

Enfoque en venta/gestión de entradas, tipos de boleto, controles de acceso, QR, listas de check-in, registro de accesos y APIs. Lección: no confundir inscripción con derecho de acceso. Sitios: https://pretix.eu/ y https://docs.pretix.eu/ .

### OpenReview

Referente especializado en recepción y evaluación científica, discusión, decisiones y flujos editoriales configurables. No sustituye una plataforma integral de congresos. Sitio: https://openreview.net/ .

## 1.3. Soluciones científicas propietarias

### EasyChair

Recepción de artículos, comités, tracks, preferencias y conflictos de revisores, asignaciones, evaluación, réplicas, decisiones, programa, proceedings e inscripciones según módulos/edición. Aporta profundidad del expediente editorial. https://easychair.org/conference_management .

### Microsoft Conference Management Toolkit (CMT)

Servicio de gestión científica, gratuito en ciertos escenarios pero no libre: revisores en niveles, asignación, conflictos, rúbricas, debate, decisiones, versiones finales, exportaciones y auditoría. Referente para revisión estructurada. https://cmtint.research.microsoft.com/About .

### ConfTool Pro

Recepción, evaluación, programación, inscripción, tarifas, facturación, pagos, comunicación y multiidioma con configuración avanzada. https://www.conftool.net/en/features.html .

### Ex Ordo

Integra propuestas, evaluación, programación con resolución de conflictos, inscripción, formatos híbridos, experiencia móvil y publicación de resultados. https://www.exordo.com/conference-management-software .

### Oxford Abstracts

Resúmenes, evaluación, agenda, pósteres digitales, comunidad, expositores y patrocinio; las funciones dependen del producto contratado. https://help.oxfordabstracts.com/knowledge/the-conference-platform .

### Fourwaves

Sitios para congresos, resúmenes, revisión, registro, certificados, agenda, galería interactiva de e-pósteres, sesiones virtuales, analítica y APIs. Referencia especialmente importante para galería digital y experiencia del participante. https://fourwaves.com/ .

### OpenConf

Ediciones de distintas características para envíos, revisiones y, según edición, programa, publicaciones, certificados y otras funciones. No presumir que edición gratuita equivale a código abierto sin restricciones. https://www.openconf.com/editions/ .

### Dryfta

Recepción/revisión de contribuciones, gestión de asistentes, agenda, networking, certificados, sesiones virtuales y estadísticas. https://dryfta.com/event-management-software/event-management-software-for-conference-events/ .

## 1.4. Soluciones generales de eventos

| Plataforma | Capacidades de referencia |
|---|---|
| Cvent | Registro, tarifas, viajes, hospedaje, pagos, credenciales, kioscos, check-in y análisis. |
| Whova | Experiencia móvil, agenda, networking, encuestas, avisos, acreditación y certificados. |
| EventMobi | App para el participante, agenda, patrocinios y experiencia híbrida. |
| vFairs | Exhibiciones virtuales, stands, salas y eventos híbridos. |
| Eventbrite | Entradas, registro y promoción. |
| Sched | Programas complejos, sesiones y agenda personal. |
| Odoo Events | Registro e integración con procesos administrativos, CRM y ventas. |
| Grenadine Event Planner | Programación de convenciones y sesiones complejas. |

## 1.5. Matriz comparativa orientativa

● = énfasis destacado; ◐ = capacidad parcial, dependiente de edición o integración; — = fuera de su foco principal. No sustituye verificación contractual.

| Sistema | Gestión científica | Organización integral | API/extensión | Experiencia digital |
|---|:---:|:---:|:---:|:---:|
| Indico | ● | ● | ● | ◐ |
| pretalx | ● | ◐ | ● | ◐ |
| Open Event | ◐ | ● | ● | ● |
| pretix | — | ● | ● | ◐ |
| EasyChair | ● | ● | ◐ | ◐ |
| Microsoft CMT | ● | ◐ | ◐ | ◐ |
| ConfTool Pro | ● | ● | ◐ | ◐ |
| Ex Ordo | ● | ● | ◐ | ● |
| Oxford Abstracts | ● | ● | ◐ | ● |
| Fourwaves | ● | ● | ● | ● |
| OpenConf | ● | ◐ | ◐ | ◐ |
| Dryfta | ● | ● | ◐ | ● |
| Cvent | ◐ | ● | ● | ● |
| Whova | ◐ | ● | ◐ | ● |

## 1.6. Síntesis competitiva

La revisión de trabajos no es un formulario: requiere estados, versiones, conflictos, auditoría y derechos de decisión. La organización debe integrar inscripción, programa, credenciales y comunicaciones. Los pósteres se convierten en objetos científicos buscables y permanentes. Hospedaje, transporte y patrocinio deben ser módulos separados. La propuesta distintiva será integrar gestión científica rigurosa, operación del evento y archivo/publicación del conocimiento, con API pública y control soberano del despliegue.

# 2. Alcance y catálogo maestro funcional

**P0:** necesario para operar un evento científico de principio a fin; **P1:** ampliación prioritaria; **P2:** extensión avanzada. La asignación es orientativa y debe ajustarse por valor, capacidad del equipo y eventos piloto.

| Nº | Módulo | Prioridad | Funcionalidades |
|---|---|---|---|
| 01 | Administración multievento | P0 | Organizaciones, eventos, series/ediciones, dominios, marca, fechas, sedes, zona horaria, módulos, plantillas y permisos. |
| 02 | Sitio público y CMS | P0 | Páginas, noticias, convocatoria, comités, ponentes, SEO, menús, traducciones, publicación programada. |
| 03 | Identidad y perfiles | P0 | Registro, login, OIDC/SSO, ORCID, afiliaciones, consentimientos y rol contextual por evento. |
| 04 | Estructura científica | P0 | Congreso, simposios, talleres, tracks, temáticas, mesas, comités, presidentes y secretarías. |
| 05 | Convocatoria y envíos | P0 | Tipos de trabajo, formularios, abstracts, papers, posters, autores, archivos, versiones, validaciones. |
| 06 | Revisión científica | P0 | Revisores, conflictos, rúbricas, carga, asignación, evaluación ciega, correcciones y dictámenes. |
| 07 | Registro de participantes | P0 | Categorías, cupos, inscripción individual/grupal, presencial/virtual, confirmaciones, exportaciones. |
| 08 | Programa científico | P0 | Salas, sesiones, ponencias, horarios, responsables, conflictos, agenda personal, publicación. |
| 09 | Credenciales y acceso | P0 | Diseño/impresión, QR, controles, reemisión, check-in y asistencia. |
| 10 | Certificados y constancias | P0 | Tipos, reglas de emisión, firmas, plantillas, QR, verificación, rectificación y revocación. |
| 11 | Galería de pósteres | P0 | Subida, validación, miniaturas, zoom, filtros, autores, sesiones, permisos y permanencia. |
| 12 | Memorias y publicaciones | P0 | Selección editorial, índices, composición, PDF/HTML, metadatos, DOI, licencias y versiones. |
| 13 | Comunicación | P0 | Correo, plantillas, envíos por segmento, notificaciones, recordatorios y bitácora. |
| 14 | Analítica | P0 | KPIs científicos, operativos, asistencia, pagos y exportación. |
| 15 | Pagos y facturación | P1 | Tarifas, monedas, descuentos, comprobantes, conciliación, facturas y reembolsos. |
| 16 | Eventos híbridos | P1 | Streaming, enlaces de videoconferencia, grabaciones, encuestas y preguntas. |
| 17 | Patrocinios y expositores | P1 | Categorías de patrocinio, logos, stands, espacios y estadísticas. |
| 18 | Hospedaje y transportación | P2 | Hoteles, cupos, reservas, itinerarios, arribos, vehículos, rutas y traslados. |
| 19 | Networking y servicios | P2 | Directorios autorizados, reuniones, excursiones, acompañantes e incidencias. |
| 20 | Inteligencia asistiva | P2 | Recomendación de revisores, detección de duplicados, clasificación, consulta semántica y análisis. |

El núcleo P0 debe resultar operable y coherente, no ser veinte prototipos superficiales.

# 3. Modelo multievento, multiinstitución y multiidioma

## 3.1. Jerarquía

**Plataforma → Organización/Tenant → Serie de evento → Edición → Evento/actividades dependientes**. Cada nivel tiene un identificador inmutable. Una organización administra distintas ediciones y eventos; un evento puede contener simposios, talleres y sesiones. Las reglas de herencia y sobrescritura de configuraciones deberán quedar explícitas.

## 3.2. Identidad y presencia por evento

Cada evento define: dominio principal y alias (por ejemplo, `universidad2028.cu`, `congresociencia.cu` o una ruta institucional), nombre, acrónimo, logotipo, colores, tipografías, páginas, idiomas habilitados, comité, reglamento, sedes, agenda, tarifas, comunicaciones, certificados y publicaciones. La resolución del dominio selecciona el contexto; **no concede permisos por sí misma**. Se requieren certificados TLS, DNS, validación de dominio, canonical URLs y políticas de aislamiento.

## 3.3. Identidad compartida y pertenencia contextual

Una persona puede ser autor en un evento, revisor en otro, coordinador en un tercero y participante en varios. Su perfil maestro y afiliaciones pueden reutilizarse bajo reglas de privacidad, pero los roles y permisos no se heredan entre eventos. **Persona**, **autoría**, **inscripción**, **revisión** y **credencial** son entidades distintas. Contemplar invitados que no tengan cuenta, cuentas que representan personas y conciliación de identidades duplicadas.

## 3.4. Configuración declarativa

Un administrador debe poder configurar tipos de trabajo, formularios, cuotas, rondas de revisión, tipos de credenciales y certificados, reglas de asistencia, módulos, plantillas e idiomas sin cambiar el código. Utilizar esquemas versionados y validados; prohibir ejecución arbitraria de código del organizador.

## 3.5. Internacionalización

Español e inglés desde el día uno: textos de UI, CMS, formularios, plantillas, notificaciones, agenda, credenciales y metadatos. Idioma por evento y usuario, fallback explícito, zona horaria, convenciones de números/fechas/monedas y soporte de traducciones de contenido. Permitir metadatos multilingües sin exigir traducción del documento científico original.

# 4. Gestión científica

## 4.1. Tipos de contribución y expediente

Resúmenes, abstracts extendidos, artículos completos, pósteres, conferencias magistrales, paneles, talleres, experiencias profesionales y propuestas de simposio. Cada registro debe conservar: título, resumen, palabras clave, idioma, área científica, autores/orden, correspondencia, afiliaciones, ORCID, declaraciones, archivos, historial de versiones, estados, revisiones y decisiones.

## 4.2. Flujo científico

Borrador → envío → validación administrativa/editorial → elegibilidad para evaluación → asignación de revisores → evaluación → decisión → correcciones/segunda ronda si procede → versión definitiva → programación → presentación → elegibilidad editorial → publicación. Permitir rechazo, retirada, devolución, suspensión, plazos, apelación si el evento la admite y registro completo de cada transición. No todo trabajo requiere peer review; aceptación científica no implica permiso automático de publicación.

## 4.3. Evaluación

Soportar evaluación abierta, simple ciego y doble ciego; criterios y ponderaciones; revisores internos/externos; carga máxima; asignación manual o sugerida; declaración de conflicto de intereses; comentarios privados al comité y para autores; discusión entre revisores; metarrevisión; segunda ronda; decisiones con motivo; recordatorios y sustituciones. La anonimización se aplica también a metadatos, documentos, descargas y comunicaciones, y requiere revisión editorial humana.

## 4.4. Ética científica y uso de IA

Declaraciones de originalidad, conflictos, consentimiento de coautores, derechos de terceros, licencias, uso de IA y detección asistida de duplicidad. La IA podrá apoyar, pero no sustituir la decisión científica ni procesar trabajos inéditos externamente sin base jurídica, protección contractual y autorización. Registrar qué modelos/proveedores se utilizan y las intervenciones humanas.

# 5. Galería de pósteres digitales

Implementar **módulo científico propio**, no un repositorio de carpetas. Póster con PDF/imagen, vista previa, resolución adecuada, zoom y multipágina, título, resumen, autores, ORCID, afiliaciones, área, idioma, número, sesión, licencia, enlace persistente, descarga según permiso y auditoría editorial. Galería por evento y colecciones históricas entre ediciones; búsqueda y filtros por temática, institución, país, autor, año y taller.

En P1/P2: video de presentación, audio, comentarios moderados, preguntas al autor, visitas, evaluación de jurado, votación cuando autorizada, premios y sesiones virtuales. Procesar imágenes y PDF en colas con límites de tamaño, análisis antivirus y protección contra contenido activo; cumplir accesibilidad y permitir metadatos alternativos.

# 6. Memorias científicas, publicaciones y preservación

## 6.1. Flujo editorial

Selección autorizada → confirmación de autorías y derechos → recepción final → control editorial → edición y estilo → índice y paginación → prueba editorial → aprobación → publicación → identificadores persistentes → preservación/exportación. El editor puede excluir contribuciones aceptadas no autorizadas para memorias.

## 6.2. Productos

Libro de resúmenes PDF/web, memorias consolidadas PDF/HTML, artículos individuales, pósteres, programa, índice de autores, índice temático, portal de archivos por edición y datos bibliográficos exportables (JSON/XML/OAI-PMH si corresponde). Plantillas editoriales para cubierta, créditos, comités, prólogo, metadatos, índices y numeración, con versiones y huellas de integridad.

## 6.3. Metadatos e identificadores

Integración eventual con ORCID, Crossref y DataCite; perfiles compatibles con Dublin Core, Schema.org y estándares pertinentes; DOI de memorias o contribuciones por intermediación de entidad registradora habilitada, nunca generación arbitraria de DOI. Separar el identificador local de la URL canónica, el DOI y las versiones. DataCite Metadata Schema 4.7 incorpora recursos Poster y Presentation. Prever licencias Creative Commons cuando el comité/editorial lo apruebe.

# 7. Participantes, inscripciones y programa

Inscripciones por categorías, modalidades y cupos; datos de contacto y afiliación, consentimiento, confirmación, listado, estados, inscripción grupal y responsabilidades por evento. Separar registro, pedido, pago y derecho de acceso. En P1: tarifas por ventana, moneda, descuentos, comprobantes, pasarelas enchufables, conciliación, reembolsos, facturación e informes. No acoplar reglas científicas a pago confirmado salvo decisión explícita.

Programa por fecha, sala, sesión, ponencia, coordinador y modalidad; conflictos de ponentes, salas y recursos; edición con borrador/publicado, versión de agenda, búsqueda, calendario personal, exportación PDF/iCal y enlaces híbridos. Un taller puede exigir inscripción y aforo independientes. Controlar husos horarios y cambios comunicados.

# 8. Credenciales, acreditación y asistencia

Plantillas visuales para delegado, ponente, conferencista, comité, revisor, prensa, patrocinador, expositor, invitado y personal. Emisión individual/lotes, PDF o impresión, QR, revocación, sustitución, cambio de categoría, verificabilidad y auditoría. Registro de acceso por evento/sesión/sede, entradas/salidas, perfiles de operador y panel de asistencia.

**Conectividad limitada:** PWA de check-in con caché local autorizada, datos mínimos, cifrado, QR con identificador opaco o firma, lista de revocaciones descargada, cola local, reconciliación, idempotencia y reglas ante accesos duplicados. La firma de QR permite probar autenticidad offline, pero no detectar uso simultáneo en dispositivos sin sincronización.

# 9. Certificados y constancias

Tipos: participación, asistencia, ponencia, autoría, revisión, comité científico, organización, talleres/cursos, premios. Reglas configurables por evento: registro confirmado, umbral de asistencia, presentación comprobada, trabajo aceptado, evaluaciones completadas, horas reconocidas y actas autorizadas. Plantillas en español/inglés, firmas, numeración, QR a verificación, emisión masiva, rectificación, revocación, reemisión y trazabilidad. QR no equivale por sí solo a firma digital jurídica. Restringir exposición pública de datos personales.

# 10. Comunicación, streaming, patrocinio y logística

## 10.1. Comunicaciones

Correos transaccionales y campañas segmentadas, plantillas traducidas, notificaciones de plazos, dictámenes, pagos, programa y certificados; estados de envío, supresión, bajas y auditoría. Adaptadores SMTP propios y colas con reintentos.

## 10.2. Eventos híbridos

Sesiones con enlaces autenticados o públicos según política, streaming, grabaciones, materiales bajo permiso, preguntas, encuestas y control de asistencia remota con reglas verificables. La herramienta de videoconferencia será sustituible.

## 10.3. Patrocinadores y exhibiciones

Patrocinios por categoría, contratos/beneficios, logos, perfiles de expositores, stands virtuales/presenciales, publicidad autorizada, leads solo con consentimiento y métricas.

## 10.4. Hospedaje

Hoteles, inventario y cupos, tipos de habitación, tarifas, períodos, peticiones y asignación, confirmaciones, exportación operativa, reglas de cancelación y acceso limitado para operadores hoteleros.

## 10.5. Transportación

Arribos/salidas, aeropuerto, itinerarios, rutas, vehículos, conductores, capacidad, pasajeros, traslados hotel-sede, incidentes y reportes de servicio. Transportación no consulta directamente tablas de evaluación científica.

## 10.6. Extensiones futuras

Acompañantes, turismo, gastronomía, traducción simultánea, protocolo, atención VIP, voluntarios, reuniones 1:1, directorios autorizados, mesa de ayuda e incidencias. Cada módulo declara contratos, permisos, eventos y migraciones.

# 11. Analítica y cuadro de mando

Indicadores: contribuciones por congreso/simposio/taller; por estado; tiempos medios de revisión; carga por revisor; aceptación/rechazo; autores, países, afiliaciones; registros por modalidad/categoría; pagos cuando apliquen; asistencias; posters más consultados; certificados emitidos; memorias publicadas, visitas y descargas. Vistas operativas por evento y consolidadas por organización, permisos estrictos, filtros, CSV/XLSX y API. Los datos de ilustración del análisis original (1.240 trabajos, 1.086 evaluaciones, 2.850 inscritos, 36 países) **son ficticios** y no se consideran datos reales del proyecto.

# 12. Arquitectura tecnológica

## 12.1. Estilo

**Monolito modular, API-first y orientado a eventos**, con delimitación clara de bounded contexts y capacidad de extraer servicios cuando haya requisitos reales. No comenzar con microservicios distribuidos por moda. Separar frontend público, portal administrativo y app/PWA de acreditación. Usar API documentada y SDK generado o tipado.

```text
Cliente web público ──────┐
Panel administrativo ─────┼── HTTPS / balanceador / protección ── API REST v1
PWA de acreditación ──────┤                                  │
Futura APK Android/iOS ───┘                            Backend modular
                                                           │
                 ┌─────────────────────────────────────────┼─────────────────────┐
              PostgreSQL                              Redis/colas          Objetos S3
                 │                                         │                     │
             auditoría/outbox                        trabajadores          PDFs/pósteres
                                                            │
                                           SMTP · OIDC · DOI · ORCID · pagos
```

## 12.2. Stack de referencia

| Capa | Preferencia inicial | Observaciones |
|---|---|---|
| Web | Next.js + React + TypeScript | SSR, SEO, accesibilidad e i18n. |
| API | NestJS + TypeScript | Módulos, OpenAPI, validación, DI. |
| BD | PostgreSQL | Integridad, transacciones, índices y RLS donde proceda. |
| ORM | Prisma o Drizzle | Decidir mediante prueba de concepto; no ambas indiscriminadamente. |
| IAM | Keycloak o proveedor OIDC institucional | SSO, MFA, federación, flujos de cuenta. |
| Cache/colas | Redis + BullMQ | Procesos asíncronos e idempotencia. |
| Archivos | S3-compatible, p. ej. MinIO | Versionado, prefijos por tenant, URLs firmadas. |
| Proxy | HAProxy y/o Nginx | TLS, múltiples dominios, limitación. |
| Documentos | Plantillas HTML/CSS → PDF | Separación de edición/generación; pruebas tipográficas. |
| Observabilidad | Prometheus/Grafana/Loki | Métricas, logs y alertas. |
| Pruebas | Jest y Playwright | Unitarias, integración, E2E y seguridad multitenant. |
| Despliegue | Ubuntu 24.04, VM y systemd | Sin dependencia inicial de Docker/Kubernetes. |

## 12.3. Estructura del monorepo

```text
scientific-events-platform/
  apps/
    public-web/
    admin-web/
    api/
    checkin-pwa/
  packages/
    contracts/
    ui/
    i18n/
    configuration/
    sdk-typescript/
  services/
    document-worker/
    media-worker/
  infrastructure/
    nginx/
    haproxy/
    systemd/
    database/
    monitoring/
  docs/
    architecture/
    adr/
    api/
    functional/
  tests/
```

## 12.4. Modelo de entidades (primera iteración)

| Contexto | Entidades |
|---|---|
| Plataforma | Organization, EventSeries, EventEdition, Event, Domain, Theme, ModuleConfiguration. |
| Identidad | Person, Identity, Affiliation, Membership, RoleAssignment, Consent. |
| Ciencia | ScientificTrack, Topic, Committee, CommitteeMember, Submission, SubmissionVersion, Authorship. |
| Revisión | Reviewer, ReviewAssignment, Review, Criterion, Decision, ConflictOfInterest. |
| Programa | Session, Presentation, Venue, Room, ScheduleSlot, Resource. |
| Inscripciones | Registration, RegistrationType, Entitlement, Attendance. |
| Finanzas | Order, Invoice, Payment, Refund, Discount. |
| Acreditación | BadgeTemplate, Credential, CheckIn. |
| Certificados | CertificateTemplate, Certificate, Issuance, Revocation. |
| Publicaciones | Proceedings, Publication, PublicationVersion, PersistentIdentifier. |
| Pósteres | Poster, PosterAsset, PosterSession, PosterInteraction. |
| Mensajes | Notification, Template, Campaign, Delivery. |
| Logística | Hotel, RoomInventory, Booking, Transfer, Vehicle, ServiceOrder. |
| Transversal | AuditEntry, OutboxEvent, Integration, WebhookDelivery. |

Las relaciones deben distinguir explícitamente persona, coautoría, inscripción y derecho de acceso. Las decisiones editoriales tienen historial y no pueden reescribirse silenciosamente.

# 13. Multi-tenancy, IAM, autorización y seguridad

Una BD PostgreSQL compartida con separación lógica estricta por organización/evento es viable inicialmente; preparar migración de tenants especiales a infraestructura separada. Resolver tenant desde dominio validado y principal autenticado, nunca confiar en `tenant_id` del cliente. Roles RBAC contextuales combinados con políticas ABAC para decisiones sensibles. SQL con filtros tenant obligatorios, restricciones compuestas para evitar cruces, Row-Level Security donde corresponda y pruebas negativas explícitas. Aislamiento de documentos en almacenamiento de objetos, URLs temporales, cifrado en tránsito, controles de subida y auditoría.

MFA administrativo, políticas de sesión y contraseñas si existen cuentas locales, OIDC, rate-limits, antivirus en archivos, protección CSRF/XSS/SSRF, backups probados, rotación de secretos, mínimos privilegios, retención, consentimiento, derecho de exportación y cumplimiento normativo. Proteger doble ciego en API, UI, exportaciones, notificaciones, metadatos PDF y registros.

# 14. Contratos API y eventos de negocio

Diferenciar API pública de lectura, API autenticada del participante, API administrativa y API para integraciones; documentación OpenAPI 3.x, versionado `/api/v1`, pagination, filtros, orden, errores normalizados, scopes y límites. No exponer datos privados en endpoints públicos.

```http
GET    /api/v1/events
POST   /api/v1/events
GET    /api/v1/events/{eventId}
GET    /api/v1/events/{eventId}/program
GET    /api/v1/events/{eventId}/submissions
POST   /api/v1/events/{eventId}/submissions
POST   /api/v1/submissions/{id}/submit
POST   /api/v1/reviews/{id}/complete
GET    /api/v1/events/{eventId}/posters
GET    /api/v1/events/{eventId}/proceedings
POST   /api/v1/events/{eventId}/registrations
POST   /api/v1/credentials/verify
POST   /api/v1/checkins
GET    /api/v1/certificates/{id}/verify
```

Los endpoints son ilustrativos. Eventos de negocio: `event.created`, `submission.submitted`, `submission.review_assigned`, `submission.accepted`, `registration.confirmed`, `payment.confirmed`, `presentation.scheduled`, `participant.checked_in`, `certificate.issued`, `proceedings.published`. Usar Transactional Outbox, consumidores idempotentes, retries y DLQ cuando aplique. Webhooks externos con firma, secuencia, reintentos y bitácora de entrega.

Una APK futura consumirá los mismos contratos, con identificadores estables, cursores de sincronización y operaciones offline explícitamente definidas. PWA es la primera estrategia móvil; cliente nativo posterior si existe justificación.

# 15. Requisitos no funcionales

| Aspecto | Meta de diseño a validar |
|---|---|
| Disponibilidad | 99,5 % inicial, según acuerdo de servicio. |
| Lecturas ligeras | API p95 < 500 ms bajo escenario de carga acordado. |
| Accesibilidad | WCAG 2.2 AA como objetivo. |
| Idiomas | Español/inglés desde primer lanzamiento. |
| Rendimiento web | Optimización para móvil y conexiones lentas. |
| Seguridad | Aislamiento verificable entre eventos; mínimo privilegio y auditoría. |
| Procesos pesados | Asíncronos, reanudables, observables. |
| Recuperación | Definir RPO y RTO por criticidad y probar restauraciones. |
| Escalabilidad | Instancias de API replicables y workers separados. |
| Interoperabilidad | OpenAPI, webhooks firmados, exportaciones abiertas. |

Las metas son objetivos propuestos, no garantías medidas. Pruebas de carga especialmente en cierre de convocatoria, publicación de dictámenes, inicio de inscripciones y check-in masivo.

# 16. Estrategia de despliegue y crecimiento

**Inicio:** VMs Ubuntu, Nginx/HAProxy, instancias Node.js bajo systemd, PostgreSQL, Redis, almacenamiento S3-compatible, trabajadores asíncronos. Automatización con Ansible, CI, backups, TLS, secretos fuera de código, logs centralizados y monitoreo. Sin requisito inicial de Docker/Kubernetes.

**Crecimiento:** escalado horizontal de API sin estado, trabajadores separados, réplicas de lectura PostgreSQL cuando estén justificadas, cachés por tenant, partición de datos y almacenamiento de objetos adecuado, CDN opcional. **Avanzado:** extracción de módulos que requieran independencia de despliegue, tecnología o capacidad; no extraer sin métricas.

# 17. Gobierno y reglas operativas

Definir responsabilidad por datos, administrador central vs. organizador, comité científico, secretaría, autor, revisor, editor, encargado de credenciales, responsable de pagos, acreditador y público. Registrar toda acción de aprobación y publicación. Definir cómo se exporta un evento completo (datos + archivos + metadatos + auditoría exportable bajo permisos) y su retención luego de finalizar.

**Principios de consistencia:** identidad global compartida sin privilegios globales; estado científico distinto del editorial; inscripción distinta del pago; presentación distinta de publicación; certificado distinto de credencial; DOI distinto de ID local; evento distinto de edición; archivo privado distinto de obra publicada.

# 18. Fases de construcción y criterios de salida

**Fase 0 — Fundaciones:** arquitectura, ADR, modelo de datos, API, threat model, UX inicial, CI y prueba multitenant. *Salida:* dos tenants aislados y diseño aprobado.

**Fase 1 — Plataforma y presencia digital:** organizaciones, dominios, identidades, roles, idiomas, temas y CMS. *Salida:* dos eventos con dominios e imagen propios coexistiendo.

**Fase 2 — Ciclo científico:** convocatorias, envíos, autores, revisión, dictámenes, versiones y agenda. *Salida:* un flujo real desde envío hasta publicación de programa.

**Fase 3 — Operación y patrimonio:** registro, credenciales, asistencia, certificados, e-pósteres, memorias, avisos e indicadores. *Salida:* piloto completo de evento científico real.

**Fase 4 — Extensiones prioritarias:** pagos, PWA offline robusta, híbridos, patrocinadores, hospedaje y transporte. *Salida:* módulos activables sin modificar el núcleo.

**Fase 5 — Ecosistema:** SDK, aplicaciones móviles, analítica avanzada, automatización/IA, integraciones. *Salida:* integración externa documentada y compatibilidad sostenida.

No comprometer plazos hasta dimensionar equipo y pilotos. Equipo mínimo por capacidades: product owner con experiencia científica, arquitectura, frontend, backend, UX, QA, DevOps/seguridad, representación editorial y usuarios piloto.

# 19. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Crecimiento descontrolado del alcance | Roadmap, requisitos priorizados y entregas verticales. |
| Cruces de datos entre tenants | RLS, filtros/contexto seguro, claves compuestas y pruebas automatizadas. |
| Congestión en fechas límite | Carga, colas, idempotencia y escalado. |
| Revisión tardía | Alertas, sustitución de revisores y tablero. |
| Identidades/autores duplicados | Perfil maestro, conciliación y autorías independientes. |
| Filtración de identidad en doble ciego | Inspección de metadatos y pruebas de permisos. |
| Publicaciones incorrectas | Aprobación editorial, versionado y evidencia. |
| Certificados fraudulentos | Identificador, verificación, revocación y auditoría. |
| Conectividad deficiente | Web liviana, PWA offline, reconciliación. |
| Dependencia comercial | Adaptadores, contratos y exportación abierta. |
| Pérdida del patrimonio científico | Backups verificados, preservación y metadatos. |
| Complejidad de plugins | Límites contractuales y migraciones controladas. |

# 20. Criterio de producto y primeras decisiones

Nombre provisional: **Plataforma de Eventos Científicos (SEP)**; no fijar marca comercial. Definición: *Plataforma para gestionar integralmente el ciclo de vida de eventos científicos, académicos y profesionales, multitenant, con identidad digital, procesos editoriales, publicación de resultados, extensiones logísticas y APIs interoperables.*

Referentes a imitar por función: **Indico** (integral/extensible); **EasyChair/CMT** (rigurosidad científica); **pretalx** (convocatoria y programa); **Fourwaves/Oxford Abstracts** (pósteres y experiencia digital); **Ex Ordo** (continuidad científica-operativa); **Cvent** (logística y acreditación); **pretix/Open Event** (operación/API).

**Primera demostración obligatoria:** dos eventos con dominios y diseños distintos, una persona con roles independientes y pruebas que demuestren que ningún usuario puede ver datos privados ajenos. No iniciar por componentes visuales desconectados del modelo de negocio.

# 21. Cuestiones abiertas para refinamiento formal

1. Evento piloto, número aproximado de trabajos, participantes, revisores y simultaneidad.
2. Tipos de revisión, método de decisión y facultades del comité por modalidad.
3. Política de autoría, anonimización y retiro de trabajos.
4. Quién edita memorias, firma certificados y registra DOI.
5. Tarifas, monedas, métodos de pago y cumplimiento local de cada sede.
6. Identidad federada requerida e integración con directorios existentes.
7. Reglas de hospedaje/traslado y proveedores autorizados.
8. Requisitos de retención, publicación histórica, eliminación y exportación.
9. Volumen de dominios, infraestructura existente y política de TLS/DNS.
10. Políticas de firma electrónica y verificación pública de certificados.

# 22. Fuentes y referencias de continuación

- Indico: https://getindico.io/ ; https://github.com/indico/indico
- pretalx: https://pretalx.com/ ; https://docs.pretalx.org/
- Open Event: https://github.com/fossasia/open-event-server
- pretix: https://pretix.eu/ ; https://docs.pretix.eu/
- OpenReview: https://openreview.net/
- EasyChair: https://easychair.org/conference_management
- Microsoft CMT: https://cmtint.research.microsoft.com/About
- ConfTool: https://www.conftool.net/en/features.html
- Ex Ordo: https://www.exordo.com/conference-management-software
- Oxford Abstracts: https://help.oxfordabstracts.com/knowledge/the-conference-platform
- Fourwaves: https://fourwaves.com/
- OpenConf: https://www.openconf.com/editions/
- Dryfta: https://dryfta.com/event-management-software/event-management-software-for-conference-events/
- Cvent: https://www.cvent.com/en/event-management-software/features
- Crossref (conferencias): https://www.crossref.org/documentation/principles-practices/conference-proceedings/
- DataCite Metadata Schema: https://schema.datacite.org/
- ORCID API: https://info.orcid.org/what-is-orcid/services/public-api/

**Nota de alcance documental:** las capacidades comerciales deben contrastarse con la versión vigente y sus licencias antes de formular una tabla contractual definitiva. Este documento conserva el análisis y las recomendaciones del estudio preliminar y añade criterios implementables iniciales.
