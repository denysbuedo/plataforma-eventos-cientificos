import { COUNTRY_CODES, QUALIFICATION_TYPES, emptyResearcherBackground, type ResearcherProfile, type ValidationIssue } from '@sep/contracts';
import type { Locale } from '@sep/i18n';

export function profileIssues(profile: ResearcherProfile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (field: string, code: string) => issues.push({ field, codes: [code] });
  const length = (field: string, value: string, min: number, max: number) => {
    if (value.trim().length < min) add(field, 'minLength');
    if (value.trim().length > max) add(field, 'maxLength');
  };
  length('name', profile.name, 2, 150);
  const background = profile.background ?? emptyResearcherBackground();
  length('background.position', background.position, 0, 150);
  length('background.degreeTitle', background.degreeTitle, 0, 150);
  length('background.biography', background.biography, 0, 1500);
  const areas = background.researchInterests.map(area => area.trim().normalize('NFC'));
  if (areas.length > 10) add('background.researchInterests', 'arrayMaxSize');
  if (new Set(areas.map(area => area.toLowerCase())).size !== areas.length) add('background.researchInterests', 'arrayUnique');
  if (areas.some(area => area.length > 80)) add('background.researchInterests', 'maxLength');
  if (background.website.trim()) {
    length('background.website', background.website, 0, 300);
    try {
      const url = new URL(background.website.trim());
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) add('background.website', 'isUrl');
    } catch { add('background.website', 'isUrl'); }
  }
  const qualifications = background.qualifications ?? [];
  if (qualifications.length > 10) add('background.qualifications', 'arrayMaxSize');
  qualifications.forEach((item, index) => {
    const field = `background.qualifications.${index}`;
    length(`${field}.title`, item.title, 2, 150);
    if (!COUNTRY_CODES.includes(item.countryCode)) add(`${field}.countryCode`, 'isIn');
    if (!QUALIFICATION_TYPES.includes(item.type)) add(`${field}.type`, 'isIn');
  });
  if (profile.affiliations.length > 5) add('affiliations', 'arrayMaxSize');
  const institutions = new Set<string>();
  profile.affiliations.forEach((item, index) => {
    length(`affiliations.${index}.institution`, item.institution, 2, 250);
    if (!COUNTRY_CODES.includes(item.countryCode)) add(`affiliations.${index}.countryCode`, 'isIn');
    const key = `${item.institution.trim().normalize('NFC').toLowerCase()}|${item.countryCode}`;
    if (institutions.has(key)) add(`affiliations.${index}.institution`, 'duplicate');
    institutions.add(key);
  });
  if (profile.discoverable && !profile.affiliations.length) add('affiliations', 'required');
  return issues;
}

export function profileIssueMessage(issue: ValidationIssue, locale: Locale): string {
  const es = locale === 'es', field = issue.field, codes = issue.codes;
  if (field.startsWith('background.researchInterests')) {
    if (codes.includes('arrayUnique')) return es ? 'Áreas de investigación: hay áreas repetidas. Escribe cada área una sola vez.' : 'Research interests: remove repeated interests.';
    if (codes.includes('arrayMaxSize')) return es ? 'Áreas de investigación: puedes indicar hasta 10 áreas.' : 'Research interests: enter up to 10 interests.';
    return es ? 'Áreas de investigación: cada área debe tener entre 1 y 80 caracteres. Sepáralas con punto y coma.' : 'Research interests: each interest must have 1–80 characters. Separate them with semicolons.';
  }
  if (field === 'background.website') return es ? 'Sitio web profesional: escribe una dirección http:// o https:// válida, sin usuario ni contraseña, de hasta 300 caracteres.' : 'Professional website: enter a valid http:// or https:// address without credentials, up to 300 characters.';
  if (field === 'affiliations') return codes.includes('required')
    ? (es ? 'Afiliaciones: añade una institución y su país para aparecer en la búsqueda de autores y revisores.' : 'Affiliations: add an institution and country to appear in author and reviewer search.')
    : (es ? 'Afiliaciones: puedes registrar hasta 5 instituciones con su país.' : 'Affiliations: enter up to 5 institutions with their countries.');
  const affiliation = field.match(/^affiliations\.(\d+)\.(.+)$/u);
  if (affiliation) {
    const prefix = `${es ? 'Afiliación' : 'Affiliation'} ${Number(affiliation[1]) + 1}: `;
    if (codes.includes('duplicate')) return prefix + (es ? 'esta institución y país ya están registrados en otra afiliación.' : 'this institution and country are already listed.');
    return prefix + (affiliation[2] === 'countryCode' ? (es ? 'selecciona un país de la lista.' : 'select a country from the list.') : (es ? 'el nombre de la institución debe tener entre 2 y 250 caracteres, sin contar espacios al inicio o al final.' : 'the institution name must have 2–250 characters, excluding surrounding spaces.'));
  }
  if (field === 'background.qualifications') return es ? 'Títulos y grados: puedes registrar hasta 10 en total.' : 'Qualifications: enter up to 10 in total.';
  const qualification = field.match(/^background\.qualifications\.(\d+)\.(.+)$/u);
  if (qualification) return `${es ? 'Título o grado' : 'Qualification'} ${Number(qualification[1]) + 1}: ` + (qualification[2] === 'title' ? (es ? 'la denominación debe tener entre 2 y 150 caracteres, sin contar espacios al inicio o al final.' : 'the official title must have 2–150 characters, excluding surrounding spaces.') : qualification[2] === 'countryCode' ? (es ? 'selecciona el país que lo otorgó.' : 'select the awarding country.') : (es ? 'selecciona un tipo de título o grado.' : 'select a qualification type.'));
  const labels: Record<string, [string, string, number]> = {
    name: ['Nombre del investigador', 'Researcher name', 150],
    'background.position': ['Cargo o función actual', 'Current position', 150],
    'background.degreeTitle': ['Dato del formulario anterior', 'Entry from the previous form', 150],
    'background.biography': ['Breve reseña profesional', 'Professional biography', 1500],
  };
  const label = labels[field];
  if (label) return `${label[es ? 0 : 1]}: ` + (field === 'name' ? (es ? 'escribe entre 2 y 150 caracteres, sin contar espacios al inicio o al final.' : 'enter 2–150 characters, excluding surrounding spaces.') : (es ? `el máximo es ${label[2]} caracteres.` : `the maximum is ${label[2]} characters.`));
  return es ? 'No pudimos validar un dato del perfil. Recarga la página; si persiste, comunica la referencia del error.' : 'A profile value could not be validated. Reload the page; if it persists, report the error reference.';
}
