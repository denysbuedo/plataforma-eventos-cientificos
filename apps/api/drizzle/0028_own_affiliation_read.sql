-- RLS already restricts affiliations to the authenticated person's own rows.
GRANT SELECT (person_id, institution) ON affiliations TO sep_runtime;
