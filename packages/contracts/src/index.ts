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

export interface SiteContent {
  acronym: string; theme: 'forest' | 'ocean';
  kickerEs: string; kickerEn: string;
  heroTitleEs: string; heroTitleEn: string;
  summaryEs: string; summaryEn: string;
  aboutEs: string; aboutEn: string;
  callEs: string; callEn: string;
  venueEs: string; venueEn: string;
  startDate: string; endDate: string; contactEmail: string;
  topicsEs: string[]; topicsEn: string[];
}
export interface PublishedSite {
  event: PublicEventView; content: SiteContent; revision: number; publishedAt: string;
}
export interface SiteDraft {
  event: EventView; content: SiteContent; revision: number;
  publishedRevision: number | null; publishedAt: string | null;
}
export interface SessionView {
  person: { id: string; name: string }; organizationId: string; eventId: string | null;
  roles: string[]; canRead: boolean; canEdit: boolean; organizationAdmin: boolean;
}
export interface EventTeam {
  organizers: { personId: string; name: string }[];
  candidates: { personId: string; name: string }[];
}
