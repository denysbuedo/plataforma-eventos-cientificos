export interface EventView {
  id: string;
  organizationId: string;
  nameEs: string;
  nameEn: string;
  timezone: string;
  status: 'draft' | 'published' | 'archived';
}

export interface PublicEventView {
  id: string;
  nameEs: string;
  nameEn: string;
  timezone: string;
}

export interface EventPage { data: EventView[]; limit: number; offset: number }
export interface ValidationIssue { field: string; codes: string[] }
export interface ApiError {
  error: { code: string; message: string; requestId: string; issues?: ValidationIssue[] };
}
