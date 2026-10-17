# Formación y trayectoria del investigador

Mi perfil permite declarar voluntariamente títulos, grados científicos y actividad profesional. No es necesario tener una titulación para participar. El registro no exige estos datos ni crea equivalencias entre países.

## Títulos y grados independientes

Se elimina del formulario «Nivel de formación completado» y el campo combinado «Grado académico o científico / título obtenido». Ese diseño confundía una clasificación de niveles con las credenciales concretas y solo permitía describir una.

Ahora se pueden añadir hasta diez credenciales, distribuidas en dos apartados:

| Apartado | Opciones |
|---|---|
| Títulos universitarios y de posgrado | Título universitario de pregrado, especialidad de posgrado, maestría/máster, otro título |
| Doctorados y grados científicos | Doctorado de investigación, doctorado superior, otro grado científico |

Cada entrada registra su **tipo**, **denominación oficial** (2–150 caracteres) y **país que la otorga**. No se infiere el país del usuario ni de su afiliación actual. Una persona puede registrar simultáneamente licenciatura/ingeniería, maestría y doctorado; las entradas no se sustituyen por un supuesto nivel máximo.

Para Cuba, las opciones científicas muestran **Doctor en determinada área del conocimiento (Dr. C.)** y **Doctor en Ciencias (Dr. Cs.)**. Son grados distintos. La denominación exacta del diploma, por ejemplo «Doctor en Ciencias Técnicas», se conserva en texto. Para otros países se mantienen las opciones generales y el nombre oficial, sin convertir PhD, DSc o cualquier otro título a una credencial cubana. Los agrupamientos ayudan a organizar lo declarado y no acreditan reconocimiento legal.

Una titulación profesional médica no se clasifica automáticamente como doctorado de investigación. El posdoctorado, los cargos, y las categorías docentes o científicas no se ofrecen como títulos obtenidos. El cargo o función actual tiene un campo independiente. No se añaden prefijos Dr./Dra. al nombre ni se presentan estas declaraciones como verificadas.

## Otras informaciones

- Cargo o función actual: hasta 150 caracteres.
- Áreas de investigación: hasta diez, con 1–80 caracteres cada una, sin duplicados; edición separada por punto y coma y vista en etiquetas.
- Breve reseña profesional: hasta 1500 caracteres, texto plano.
- Sitio web profesional: hasta 300 caracteres, solo HTTP/HTTPS sin credenciales incorporadas.

Se conservan nombre, afiliaciones con institución/país y ORCID. Todos los bloques de formación son opcionales; cada entrada puede quitarse. Si se añade una, se completa su denominación y país antes de guardar.

## Compatibilidad y privacidad

`researcher_profiles.background.qualifications` almacena la lista. El JSONB existente admite este campo sin modificar migraciones ya aplicadas ni requerir una nueva columna. Los perfiles anteriores sin lista se muestran con lista vacía.

Los campos anteriores `educationLevel` y `degreeTitle` quedan obsoletos en la API y no se convierten automáticamente. Si contienen información, la interfaz la muestra como «Dato del formulario anterior», con instrucciones para registrarla en su apartado y un botón para quitar el dato anterior. Se preserva el texto original hasta que el usuario lo retire expresamente.

Omitir `background` conserva todo el bloque. Un cliente anterior que envía `background` sin `qualifications` conserva la lista existente. Enviar `qualifications: []` la borra expresamente. La revisión optimista, auditoría y RLS/FORCE de la cuenta siguen protegiendo el perfil.

El directorio voluntario expone únicamente nombre, afiliaciones y ORCID de producción. Los títulos, grados, cargo, reseña, áreas y sitio web no se publican allí. Estos datos no cambian autorías, permisos, versiones oficiales ni certificados. La conexión ORCID autentica el identificador; no importa el expediente educativo.

## Referencias

- [ORCID: educación y cualificaciones](https://support.orcid.org/hc/en-us/articles/360006973933-Add-an-education-or-qualification-to-your-ORCID-record). Registra entradas educativas y su denominación, sin reducirlas a un único nivel máximo.
- [Ministerio de Educación Nacional de Colombia: guía del sistema educativo de Cuba](https://contenidos.mineducacion.gov.co/ntg/men/micrositio_convalidaciones/Guias_mineducacion/MINEDU-cuba/assets/files/Guia_Sistema_Educativo_de_Cuba.pdf). Distingue especialidad, maestría y grados científicos Dr. C./Dr. Cs.

## Comprobaciones y ampliaciones

Comprobaciones acotadas, sin una batería completa: compilación de API e interfaz, lint, validación de entradas múltiples/tipos/países/límites, guardado y compatibilidad con clientes anteriores mediante transacciones revertidas. Vista española/inglesa y móvil con guardado interceptado en el navegador para conservar el perfil real.

Como ampliación futura pueden añadirse institución otorgante, fechas y estudios en curso, y cargos/categorías asociados a cada afiliación. No se solicitan por defecto diplomas, documento de identidad, fecha de nacimiento, nacionalidad o domicilio para gestionar trabajos científicos.

Para compilar la interfaz sin sobrescribir la demo en uso, admin-web admite `SEP_NEXT_DIST_DIR`. Preparar un directorio distinto y arrancar con ese mismo valor permite promover la nueva versión conservando la anterior; `.next-*` no se versiona.
