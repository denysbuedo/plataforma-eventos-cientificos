import type { ValidationError } from 'class-validator';
import type { ValidationIssue } from '@sep/contracts';

// Keep nested field paths, without exposing submitted values or validator messages.
export function validationIssues(errors: ValidationError[], parent = ''): ValidationIssue[] {
  return errors.flatMap(error => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const codes = Object.keys(error.constraints ?? {});
    return [...(codes.length ? [{ field, codes }] : []), ...validationIssues(error.children ?? [], field)];
  });
}
