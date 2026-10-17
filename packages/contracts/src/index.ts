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
export interface OrganizationPerson { personId: string; name: string; eventCount: number }
export interface OrganizationInvitation {
  id: string; name: string; email: string; status: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt: string; expiresAt: string; acceptedAt: string | null;
}
export interface PeopleDirectory { people: OrganizationPerson[]; invitations: OrganizationInvitation[] }
export interface CreatedInvitation { invitation: OrganizationInvitation; token: string }

export interface OrganizationProfile { id: string; name: string; contactEmail: string; website: string; description: string; revision: number }
export interface ManagedDomain {
  id: string; eventId: string | null; hostname: string; active: boolean; verified: boolean; tlsReady: boolean;
  verificationToken: string | null;
}
export interface OrganizationSettings { organization: OrganizationProfile; domains: ManagedDomain[] }

export type EventLifecycle = 'planning' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export interface ScientificTrack { id: string; nameEs: string; nameEn: string }
export interface ContributionType extends ScientificTrack {
  abstractMinWords: number; abstractMaxWords: number; keywordsMin: number; keywordsMax: number;
  manuscriptRequired: boolean; maxPages: number | null;
}
export interface ScientificCallContent {
  titleEs: string; titleEn: string; instructionsEs: string; instructionsEn: string;
  opensOn: string | null; closesOn: string | null; tracks: ScientificTrack[]; contributionTypes: ContributionType[];
}
export interface PublishedScientificCall { content: ScientificCallContent; timezone: string; revision: number; publishedAt: string }
export interface ScientificCallDraft {
  content: ScientificCallContent; revision: number; publishedRevision: number | null; publishedAt: string | null;
  timezone: string; publication: PublishedScientificCall | null;
}
export interface AuthorWorkSummary {
  canManage?: boolean;
  id: string; title: string; language: 'es' | 'en'; trackId: string; contributionTypeId: string; revision: number;
  createdAt: string; updatedAt: string;
  editable: boolean; status: WorkStatus; submittedAt: string | null; responseDeadline: string | null;
}
export interface WorkAffiliation { institution: string; countryCode: string }
export interface WorkAuthor { id: string; fullName: string; email: string; affiliations: WorkAffiliation[]; corresponding: boolean; orcid?: string; personId?: string; orcidVerified?: boolean; authorshipConfirmed?:boolean }
export const EDUCATION_LEVELS = ['', 'short_cycle', 'bachelor', 'master', 'doctorate', 'other'] as const;
export const QUALIFICATION_TYPES = ['university_title','postgraduate_specialization','masters','other_title','research_doctorate','higher_doctorate','other_scientific_degree'] as const;
export interface ResearcherQualification { type:typeof QUALIFICATION_TYPES[number]; title:string; countryCode:string }
export interface ResearcherBackground {
  qualifications?:ResearcherQualification[];
  /** Legacy declarations retained without guessing their qualification type. */
  educationLevel:typeof EDUCATION_LEVELS[number]; degreeTitle:string; position:string;
  researchInterests:string[]; biography:string; website:string;
}
export const emptyResearcherBackground = ():ResearcherBackground => ({qualifications:[],educationLevel:'',degreeTitle:'',position:'',researchInterests:[],biography:'',website:''});
export interface ResearcherProfile { name:string; affiliations:WorkAffiliation[]; discoverable:boolean; revision:number; background?:ResearcherBackground }
export interface ResearcherCandidate { personId:string; name:string; affiliations:WorkAffiliation[]; orcid:string|null }
export interface OrcidConnection { id: string; environment: 'production' | 'sandbox'; connectedAt: string }
export interface AuthorAccount { id: string; name: string; email: string; institutions: string[]; orcid: OrcidConnection | null; orcidAvailable: boolean; researcherProfile?:ResearcherProfile }
export const WORK_STATUSES = ['draft','submitted','in_review','changes_requested','accepted','rejected','withdrawn','final_requested','final_submitted'] as const;
export type WorkStatus = typeof WORK_STATUSES[number];
export interface Manuscript { id: string; name: string; bytes: number; pages: number; sha256: string; scan: 'clean' | 'demo_unscanned' }
export interface WorkContent { title: string; abstract: string; keywords: string[]; language: 'es' | 'en'; trackId: string; contributionTypeId: string; call: PublishedScientificCall; authors: WorkAuthor[]; manuscript: Manuscript | null }
export interface WorkVersionSummary { id: string; number: number; kind: 'submission' | 'final'; createdAt: string }
export interface WorkHistory { id: string; action: string; message: string; actor: 'author' | 'staff'; actorId?:string; actorName?:string; createdAt: string }
export interface WorkCollaboration { id:string; authorId:string; email:string; status:'pending'|'accepted'|'revoked'|'expired'; createdAt:string; expiresAt:string; acceptedAt:string|null }
export interface CreatedWorkCollaboration { invitation:WorkCollaboration; token:string; work:AuthorWork }
export type AuthorshipBasis = 'account'|'email'|'orcid';
export interface AuthorshipCandidate { workId:string; authorId:string; fullName:string; basis:AuthorshipBasis }
export interface AuthorshipContribution { workId:string; authorId:string; fullName:string; title:string; status:WorkStatus }
export interface AuthorshipClaim extends AuthorshipCandidate {
  id:string; claimantName:string; status:'pending'|'approved'|'rejected'|'revoked'; revision:number;
  createdAt:string; decidedAt:string|null; message:string; title:string|null; stale:boolean;
  responsibility:'submitter'|'corresponding'; needsIndependentReview:boolean; canDecide:boolean; canCancel:boolean; canRevoke:boolean; unread:boolean;
}
export interface AuthorshipResponsibility { workId:string; title:string; revision:number; responsibility:'submitter'|'corresponding'; canAccept:boolean; canRelease:boolean }
export interface AuthorshipWorkspace { candidates:AuthorshipCandidate[]; contributions:AuthorshipContribution[]; claims:AuthorshipClaim[]; responsibilities:AuthorshipResponsibility[] }
export interface WorkVersion extends WorkVersionSummary { content: WorkContent }
export interface AuthorWork extends AuthorWorkSummary, WorkContent { versions: WorkVersionSummary[]; history: WorkHistory[]; editable: boolean }
export interface StaffWork extends AuthorWork { canDecide: boolean }
export interface SubmissionPage { data: AuthorWorkSummary[]; limit: number; offset: number }
export const MAX_WORK_BODY_BYTES = 384 * 1024;
export const MAX_MANUSCRIPT_BYTES = 5 * 1024 * 1024;
export interface AuthorWorkspace {
  event: PublicEventView; works: AuthorWorkSummary[]; call: PublishedScientificCall | null;
  languages: ('es' | 'en')[];
  editable: boolean; reason: 'available' | 'no_call' | 'closed' | 'inactive';
  requireSubmittingAuthorOrcid?: boolean;
}
export interface EventConfiguration {
  timezone: string; startDate: string | null; endDate: string | null;
  modality: 'in_person' | 'virtual' | 'hybrid'; languages: ('es' | 'en')[]; defaultLanguage: 'es' | 'en';
  lifecycle: EventLifecycle; revision: number;
  requireSubmittingAuthorOrcid?: boolean;
}

export { COUNTRY_CODES } from './countries.js';
export { validOrcid } from './orcid.js';


export const REVIEW_RECOMMENDATIONS=['accept','minor_changes','major_changes','reject'] as const;
export interface ReviewCriterion { id:string; labelEs:string; labelEn:string }
export interface ReviewEvaluation { scores:{criterionId:string;score:number}[]; recommendation:typeof REVIEW_RECOMMENDATIONS[number]|''; authorComments:string; confidentialComments:string }
export interface ReviewMember { pendingReviews?:number; personId:string; name:string; status:'invited'|'accepted'|'declined'|'revoked'; expertise:string; revision:number; createdAt:string }
export interface ReviewContent { title:string; abstract:string; keywords:string[]; language:'es'|'en'; authors:{fullName:string;affiliations:WorkAffiliation[]}[]; manuscript:Manuscript|null }
export interface ReviewRound { id:string;workId:string;versionId:string;versionNumber:number;number:number;status:'open'|'closed';deadline:string;timezone:string;minimumReviews:number;criteria:ReviewCriterion[];revision:number;createdAt:string;closedAt:string|null }
export interface ReviewAssignment { eligible?:boolean; id:string;roundId:string;workId:string;reviewerId:string;reviewerName:string;status:'invited'|'accepted'|'declined'|'conflict'|'revoked'|'submitted';title:string;versionNumber:number;deadline:string;timezone:string;revision:number;submittedAt:string|null;message:string;evaluation:ReviewEvaluation|null;content?:ReviewContent;criteria:ReviewCriterion[];available:boolean }
export interface ReviewWorkspace { members:ReviewMember[];assignments:ReviewAssignment[] }
export interface WorkReviewFile { rounds:ReviewRound[];assignments:ReviewAssignment[] }
