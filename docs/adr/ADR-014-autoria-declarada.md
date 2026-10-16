# ADR-014: coautores, afiliaciones y correspondencia del borrador

Estado: implementado; validación funcional completa pendiente.

## Decisión

Los borradores de trabajo incorporan autoría declarada: lista ordenada de hasta 20 autores, cada uno con UUID estable, nombre completo, correo de contacto, indicador de correspondencia y entre una y cinco afiliaciones. Cada afiliación contiene institución y país ISO 3166-1 alpha-2. El catálogo compartido usa los códigos admitidos por la dependencia validator instalada; los nombres de países se presentan con Intl.DisplayNames en el idioma de la interfaz.

Estos datos pertenecen al trabajo. No se modifican people, identities o affiliations de cuentas existentes, ni se crean cuentas, membresías o inscripciones. No se fusionan personas por nombre o correo. El propietario del borrador sigue siendo la identidad autenticada que lo creó; declarar un autor de correspondencia diferente no transfiere la propiedad ni otorga permisos. Los correos son declarados, no verificados por este incremento, y no se envían notificaciones.

## Persistencia y control

La lista se almacena en la columna JSONB authors de author_works, con restricción de array y máximo de 20 entradas. El orden del array representa el orden de autoría. Es un documento acotado de preparación, no la entidad Persona ni una relación de colaboración entre cuentas. Al implementar envío y versiones deberá copiarse en la versión científica correspondiente; una futura vinculación a cuentas deberá ser explícita.

La autoría se guarda con la misma operación PUT y revisión del borrador. Permanece bajo el aislamiento RLS/FORCE existente por organización, evento y propietario, sin acceso adicional para el administrador institucional. Solo se añade UPDATE(authors) al runtime; propietario, ámbito y convocatoria conservada siguen protegidos contra modificación. La auditoría work.draft.saved registra la operación en la misma transacción, sin añadir correos ni otros datos personales al registro de auditoría.

Los borradores anteriores y los nuevos empiezan con authors vacío. El creador no se añade automáticamente como autor. Omitir authors en una petición PUT conserva la lista anterior, para compatibilidad con clientes previos. Enviar [] elimina las declaraciones del borrador. Se puede mantener un borrador sin autores mientras se prepara; los mínimos para el envío se validarán en ese incremento.

## Validación

La API valida UUID únicos, nombres, longitudes, correos, afiliaciones completas y países admitidos. Si hay autores, debe haber exactamente uno de correspondencia y su correo no puede estar vacío. Los demás correos son opcionales. No se permite repetir institución y país dentro del mismo autor, comparando institución recortada, normalizada NFC y sin distinción de mayúsculas. Las personas con igual nombre no se fusionan ni se rechazan por ese motivo.

El propietario puede reordenar, añadir o retirar autores y afiliaciones mientras la edición del trabajo esté disponible. Retirar al autor de correspondencia no designa silenciosamente otro: se deberá seleccionar explícitamente uno antes de guardar. El primer autor añadido aparece inicialmente seleccionado como correspondencia y el formulario exige su correo.

Para admitir resúmenes multilingües y listas de afiliaciones, el cuerpo JSON del API tiene un límite explícito de 384 KiB. El gateway usa el mismo límite en bytes para Mis trabajos; las demás rutas conservan su límite anterior. Los límites de campos y catálogos siguen validándose independientemente.

## Interfaz y límites

La autoría aparece en consulta como lista ordenada, con instituciones, países e indicador de correspondencia. Los formularios solo aparecen al pulsar Editar. Guardar y Cancelar vuelven a consulta; Volver al listado conserva el comportamiento acordado, incluida confirmación para cambios sin guardar.

No hay invitación de coautores, aceptación de autoría, validación de instituciones, ORCID, verificación de correo, edición colaborativa ni envío formal. Es información declarada por el propietario para preparar la contribución. No se expone en el portal público.

La compilación, las comprobaciones dirigidas y la prueba manual anterior del propietario no equivalen a validar todo este nuevo incremento. Las pruebas completas continúan aplazadas según la instrucción vigente.
