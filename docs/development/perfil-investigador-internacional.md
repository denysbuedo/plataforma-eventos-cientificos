# Formación y trayectoria del investigador

La sección de Mi perfil pasa de «Información académica» a **Formación y trayectoria** para incluir formación, grado científico y actividad profesional. No se añade un formulario obligatorio al acceso RedUniv/Google: se completa voluntariamente desde Mi perfil, sin excluir a estudiantes, asistentes o personas sin titulación universitaria.

## Referencias y criterio

ORCID separa [educación y cualificaciones](https://support.orcid.org/hc/en-us/articles/360006894714-Metadata-in-the-Education-and-Qualification-section), donde conserva el nombre del título, institución y fechas, de la actividad profesional. Su [información biográfica](https://support.orcid.org/hc/en-us/articles/360006973673-Add-identifying-biographical-information-to-your-ORCID-record) permite áreas/palabras clave, reseña, enlaces y otros identificadores. No existe un único formulario obligatorio internacional para cualquier investigador.

La clasificación [ISCED de UNESCO](https://www.uis.unesco.org/en/methods-and-tools/isced) permite describir niveles educativos entre países; no convierte por sí sola títulos individuales ni acredita equivalencias. Los perfiles [R1–R4 de la Comisión Europea](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ%3AC_202301640) describen trayectoria investigadora y no son grados académicos. No se importan como una categoría científica universal ni se asignan automáticamente por edad, cargo o título.

## Datos implementados

| Dato | Regla |
|---|---|
| Nivel de formación completado | Sin especificar, titulación superior de ciclo corto, grado/licenciatura o equivalente, maestría o equivalente, doctorado u otra titulación |
| Grado académico o científico / título obtenido | Texto de hasta 150 caracteres; conserva la denominación del país, por ejemplo Doctor en Ciencias Técnicas, PhD in Engineering, MSc o una titulación profesional |
| Cargo o función actual | Texto de hasta 150 caracteres; permite investigador, docente, doctorando, profesional, etc. |
| Áreas de investigación | Hasta 10 áreas de hasta 80 caracteres, sin duplicados; edición separada por punto y coma y presentación en etiquetas |
| Breve reseña profesional | Hasta 1500 caracteres, texto plano |
| Sitio web profesional | Hasta 300 caracteres, solo HTTP/HTTPS, sin credenciales incorporadas |

Se conservan nombre, afiliaciones con institución/país y ORCID. Todos los nuevos campos son opcionales y pueden borrarse explícitamente. El nivel se refiere a formación completada: estar cursando un doctorado o desempeñar un posdoctorado no añade automáticamente un grado obtenido. No se añaden prefijos Dr./Dra. al nombre, no se valida equivalencia legal ni se presentan títulos declarados como verificados. Estos datos no modifican autorías, permisos, versiones oficiales ni certificados.

## Privacidad y compatibilidad

Los nuevos datos se conservan en `researcher_profiles.background`, con RLS/FORCE de la cuenta, migración 0045 y valores iniciales vacíos. `/me` devuelve el bloque propio; PUT `/me/researcher-profile` lo valida y guarda con revisión optimista y auditoría del perfil. Omitir background conserva sus valores, para admitir clientes anteriores. Enviarlo completo con campos vacíos los borra expresamente.

El directorio voluntario sigue exponiendo únicamente nombre, afiliaciones y ORCID de producción. No publica grado, cargo, reseña, áreas o sitio web, ni importa el expediente completo de ORCID. La conexión actual de ORCID continúa sirviendo para autenticar el identificador; no obtiene la formación del usuario.

## Ampliaciones recomendadas

Si el uso del sistema lo requiere, ampliar hacia múltiples titulaciones (institución, país, fecha y estado), departamento/cargo por afiliación, nombres de publicación y enlaces a otros identificadores como Scopus Author ID o ResearcherID. Los departamentos y cargos deben asociarse a su institución correspondiente si hay varias; no inventar una equivalencia común de categorías docentes/científicas nacionales. ROR puede ayudar a identificar instituciones en una futura integración.

No se solicitan por defecto documento de identidad, fecha de nacimiento, género, nacionalidad, teléfono o domicilio para gestionar trabajos científicos. Una necesidad específica de inscripción o facturación debe tratarse en su módulo y justificarse por su uso. No se exige cargar diplomas o CV ni conectar todos los identificadores externos para participar.

## Comprobaciones

Se verificaron con servicios reales y transacciones revertidas el guardado, lectura, borrado explícito, preservación al omitir background y aislamiento de los datos frente a otras cuentas y al directorio. La validación rechaza nivel desconocido, áreas duplicadas/excesivas, campos demasiado largos, bloques no estructurados y URLs ejecutables o con credenciales. Se conservan perfiles y conexiones ORCID de demo. En navegador se verificaron los campos y su presentación guardada en español/inglés, la separación de áreas, reseña y enlace web, y la vista móvil; ese guardado se interceptó solo en el navegador para no alterar el perfil real. Las comprobaciones HTTP confirmaron la continuidad de Mis trabajos, Autorías, el portal y la conexión ORCID Sandbox.

Para preparar la interfaz sin sobrescribir la compilación en uso, admin-web admite `SEP_NEXT_DIST_DIR`. Compilar en un directorio de entrega diferente y arrancar con ese mismo valor permite revisar/promover la nueva versión conservando la anterior. El valor por defecto sigue siendo `.next`; los directorios `.next-*` son locales y no se versionan.
