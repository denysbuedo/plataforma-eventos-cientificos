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
  unreadNotices?:number;
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
export interface WorkReviewReply { number:number;text:string }
export interface WorkReviewResponseDraft { decisionId:string;summary:string;replies:WorkReviewReply[] }
export interface WorkReviewResponse extends WorkReviewResponseDraft { feedbackId?:string;feedbackVersionNumber?:number; versionNumber:number;decisionMessage:string;feedbackMessage:string;roundNumber?:number;comments?:WorkReviewReply[] }
export interface WorkResponseTarget { decisionId:string;message:string;versionNumber:number;feedback?:AuthorReviewFeedback }
export interface WorkContent { reviewResponse?:WorkReviewResponse;title: string; abstract: string; keywords: string[]; language: 'es' | 'en'; trackId: string; contributionTypeId: string; call: PublishedScientificCall; authors: WorkAuthor[]; manuscript: Manuscript | null }
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
export interface AuthorFeedbackBody { roundNumber:number;versionNumber:number;comments:{number:number;text:string}[] }
export interface AuthorReviewFeedback { id:string;publishedAt:string;message:string;roundNumber?:number;versionNumber?:number;comments?:{number:number;text:string}[] }
export interface WorkNoticeSummary { workId:string;title:string;status:WorkStatus;unreadNotices:number;latestAt:string }
export interface WorkNoticeBoard { count:number;items:WorkNoticeSummary[] }
export interface AuthorWork extends AuthorWorkSummary, WorkContent { reviewResponseDraft?:WorkReviewResponseDraft|null;responseTarget?:WorkResponseTarget;submissionReady?:boolean;authorFeedback?:AuthorReviewFeedback[];noticeIds?:string[]; versions: WorkVersionSummary[]; history: WorkHistory[]; editable: boolean }
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
export interface ReviewMember { overdueReviews?:number;dueSoonReviews?:number;pendingReviews?:number; personId:string; name:string; status:'invited'|'accepted'|'declined'|'revoked'; expertise:string; revision:number; createdAt:string }
export interface ReviewContent { reviewResponse?:WorkReviewResponse;title:string; abstract:string; keywords:string[]; language:'es'|'en'; authors:{fullName:string;affiliations:WorkAffiliation[]}[]; manuscript:Manuscript|null }
export interface ReviewDeadlineExtension { previousDeadline:string;deadline:string;message:string;createdAt:string }
export type ReviewTiming='on_time'|'due_soon'|'overdue'|'completed'|'inactive';
export interface ReviewRound { originalDeadline?:string;deadlineExtensions?:ReviewDeadlineExtension[]; id:string;workId:string;versionId:string;versionNumber:number;number:number;status:'open'|'closed';deadline:string;timezone:string;minimumReviews:number;criteria:ReviewCriterion[];revision:number;createdAt:string;closedAt:string|null }
export interface ReviewAssignment { timing?:ReviewTiming;originalDeadline?:string;deadlineExtensions?:ReviewDeadlineExtension[];eligible?:boolean; id:string;roundId:string;workId:string;reviewerId:string;reviewerName:string;status:'invited'|'accepted'|'declined'|'conflict'|'revoked'|'submitted';title:string;versionNumber:number;deadline:string;timezone:string;revision:number;submittedAt:string|null;message:string;evaluation:ReviewEvaluation|null;content?:ReviewContent;criteria:ReviewCriterion[];available:boolean }
export interface ReviewWorkspace { members:ReviewMember[];assignments:ReviewAssignment[] }
export interface WorkReviewFile { responseChecks?:ResponseCheck[];rounds:ReviewRound[];assignments:ReviewAssignment[] }

export interface ResponseCheckContent { summary:string;observation:string;reply:string;decisionMessage:string }
export interface ResponseCheck { id:string;workId:string;versionId:string;versionNumber:number;sourceVersionNumber:number;title:string;number:number;revision:number;verdict:'accepted'|'rejected'|null;message:string;createdAt:string;assessedAt:string|null;assessable:boolean;eligible?:boolean;reviewerName?:string;content?:ResponseCheckContent }

export interface ReviewTrackingItem { assignmentId:string;workId:string;title:string;reviewerName:string;roundNumber:number;versionNumber:number;deadline:string;timezone:string;status:'invited'|'accepted';timing:'on_time'|'due_soon'|'overdue' }
export interface ReviewTracking { pending:number;dueSoon:number;overdue:number;awaitingAcceptance:number;inProgress:number;items:ReviewTrackingItem[];total:number;limit:number;offset:number }


export const PROGRAM_ACTIVITY_TYPES=['symposium','workshop','roundtable','panel','debate','forum','seminar','colloquium','course','thematic_track','other'] as const;
export const PROGRAM_SESSION_TYPES=['oral','poster','panel','roundtable','debate','practical','tutorial','keynote','plenary','seminar','forum','other'] as const;
export const PROGRAM_PRESENTATION_FORMATS=['oral','short_oral','poster','e_poster','demonstration','video','pecha_kucha','discussion','other'] as const;
export const PROGRAM_PARTICIPANT_ROLES=['speaker','panelist','discussant','facilitator'] as const;
export type ProgramActivityType=typeof PROGRAM_ACTIVITY_TYPES[number];
export type ProgramSessionType=typeof PROGRAM_SESSION_TYPES[number];
export type ProgramPresentationFormat=typeof PROGRAM_PRESENTATION_FORMATS[number];
export type ProgramParticipantRole=typeof PROGRAM_PARTICIPANT_ROLES[number];
export interface ProgramSpace {id:string;code:string;name:string;kind:'physical'|'virtual';location:string;capacity:number|null;active:boolean;revision:number}
export interface ProgramSpaces {spaces:ProgramSpace[]}
export interface ProgramActivityInput {id:string;type:ProgramActivityType;titleEs:string;titleEn:string;descriptionEs:string;descriptionEn:string;coordinatorIds:string[]}
export interface ProgramActivity extends ProgramActivityInput {coordinators:{personId:string;name:string}[]}
export interface ProgramParticipantInput {personId:string;role:ProgramParticipantRole}
export interface ProgramSlotInput {id:string;workId:string;presenterAuthorId:string;startsAt:string;endsAt:string;format?:ProgramPresentationFormat;modality?:'in_person'|'virtual';displayCode?:string}
export interface ProgramSessionInput {id:string;titleEs:string;titleEn:string;topicEs:string;topicEn:string;date:string;startsAt:string;endsAt:string;modality:'in_person'|'virtual'|'hybrid';moderatorIds:string[];slots:ProgramSlotInput[];type?:ProgramSessionType;activityId?:string|null;roomId?:string|null;virtualRoomId?:string|null;descriptionEs?:string;descriptionEn?:string;participants?:ProgramParticipantInput[]}
export interface ProgramSlot extends ProgramSlotInput {title:string;authors:string[];presenterOptions:{id:string;name:string}[];presenterName:string;presenterPersonId:string|null;versionId:string;versionNumber:number}
export interface ProgramSession extends Omit<ProgramSessionInput,'slots'|'participants'> {room:string;virtualRoom?:string|null;roomLocation?:string;moderators:{personId:string;name:string}[];participants?:(ProgramParticipantInput&{name:string})[];slots:ProgramSlot[]}
export interface ProgramSnapshot {timezone:string;sessions:ProgramSession[];activities?:ProgramActivity[];revision:number;publishedAt:string}
export interface ProgramDraft {sessions:ProgramSession[];activities:ProgramActivity[];timezone:string;startDate:string|null;endDate:string|null;revision:number;publishedRevision:number|null;publishedAt:string|null}
export interface ProgramCandidate {workId:string;title:string;versionNumber:number;authors:{id:string;name:string}[]}
export interface ProgramCandidates {data:ProgramCandidate[];total:number;limit:number;offset:number}
export interface PublicProgram extends Omit<ProgramSnapshot,'sessions'|'activities'> {activities?: (Omit<ProgramActivity,'coordinatorIds'|'coordinators'>&{coordinators:string[]})[];sessions:(Omit<ProgramSession,'moderatorIds'|'moderators'|'slots'|'participants'>&{moderators:string[];participants?:{name:string;role:ProgramParticipantRole}[];slots:Omit<ProgramSlot,'presenterPersonId'|'presenterOptions'>[]})[]}
export interface MyParticipation {timezone:string|null;publishedAt:string|null;activities?:{id:string;titleEs:string;titleEn:string;type:ProgramActivityType}[];items:{sessionId:string;slotId:string|null;title:string;sessionTitleEs:string;sessionTitleEn:string;date:string;startsAt:string;endsAt:string;room:string;modality:ProgramSessionInput['modality']|'in_person'|'virtual';role:'presenter'|'moderator'|ProgramParticipantRole;activityTitleEs?:string;activityTitleEn?:string;sessionType?:ProgramSessionType;format?:ProgramPresentationFormat}[]}


export const REGISTRATION_STATES=['pending','confirmed','waitlisted','rejected','cancelled'] as const;
export type RegistrationState=typeof REGISTRATION_STATES[number];
export type RegistrationModality='in_person'|'virtual';
export interface RegistrationCategory {id:string;nameEs:string;nameEn:string;active:boolean}
export interface RegistrationContent {opensOn:string|null;closesOn:string|null;instructionsEs:string;instructionsEn:string;approvalRequired:boolean;capacityInPerson:number|null;capacityVirtual:number|null;modalities:RegistrationModality[];categories:RegistrationCategory[]}
export interface PublishedRegistration {id:string;content:RegistrationContent;timezone:string;revision:number;publishedAt:string}
export interface RegistrationCounts {pending:number;confirmed:number;waitlisted:number;inPerson:number;virtual:number;ownPosition:number|null}
export interface RegistrationSettings {content:RegistrationContent;revision:number;publication:PublishedRegistration|null;publishedActive:boolean;timezone:string;counts:RegistrationCounts}
export interface PublicRegistration {publication:PublishedRegistration;available:boolean;reason:'open'|'upcoming'|'closed'|'inactive'|'timezone_changed';counts:RegistrationCounts}
export interface RegistrationEntry {id:string;personId:string;name:string;email:string|null;affiliations:WorkAffiliation[];category:RegistrationCategory;modality:RegistrationModality;status:RegistrationState;revision:number;requestedAt:string;updatedAt:string;policy:PublishedRegistration}
export interface RegistrationHistory {id:string;action:string;status:RegistrationState;actorName:string;message:string;createdAt:string}
export interface RegistrationDetail {entry:RegistrationEntry;history:RegistrationHistory[]}
export interface MyRegistration {registration:RegistrationDetail|null;reception:PublicRegistration|null;profile:{name:string;affiliations:WorkAffiliation[];email:string|null}}
export type RegistrationSummary=Omit<RegistrationEntry,'policy'|'affiliations'|'email'>;
export interface RegistrationPage {data:RegistrationSummary[];total:number;limit:number;offset:number;counts:RegistrationCounts}

export interface AttendanceCredential {revision:number;active:boolean;issuedAt:string}
export interface AttendanceRecord {id:string;targetKey:string;eventStartDate:string;eventEndDate:string;sessionId:string|null;titleEs:string;titleEn:string;date:string|null;startsAt:string|null;endsAt:string|null;timezone:string;modality:RegistrationModality;state:'present'|'voided';observedAt:string;revision:number;updatedAt:string}
export interface AttendanceHistory {id:string;recordId:string;action:string;actorName:string;reason:string;state:'present'|'voided';observedAt:string;createdAt:string}
export interface AttendanceDetail {registration:RegistrationSummary|null;credential:AttendanceCredential|null;records:AttendanceRecord[];history:AttendanceHistory[]}
export interface AttendanceSession {id:string;titleEs:string;titleEn:string;date:string;startsAt:string;endsAt:string;modality:'in_person'|'virtual'|'hybrid';room:string}
export interface AttendanceWorkspace {data:(RegistrationSummary&{eventPresent:boolean;sessionCount:number})[];total:number;limit:number;offset:number;sessions:AttendanceSession[];timezone:string;startDate:string|null;endDate:string|null}

export const CERTIFICATE_KINDS=['attendance','presentation','review','organization','custom'] as const;
export type CertificateKind=typeof CERTIFICATE_KINDS[number];
export interface CertificateSigner {name:string;position:string;image:string|null}
export interface CertificateTemplateContent {name:string;kind:CertificateKind;active:boolean;afterEvent:boolean;titleEs:string;titleEn:string;bodyEs:string;bodyEn:string;participationEs:string;participationEn:string;accent:string;logo:string|null;signers:CertificateSigner[];verificationOrigin:string}
export interface CertificateTemplate {id:string;revision:number;content:CertificateTemplateContent}
export interface CertificateTemplateSummary {id:string;revision:number;name:string;kind:CertificateKind;active:boolean}
export interface CertificateCandidate {personId:string|null;name:string;subjectKey:string;subjectTitle:string;eligible:boolean;missing:string[];evidenceHash:string}
export interface CertificateCandidatePage {data:CertificateCandidate[];total:number;limit:number;offset:number;templateRevision:number}
export interface CertificateSummary {id:string;templateId:string;personId:string;name:string;kind:CertificateKind;participation:string;subjectTitle:string;status:'issued'|'revoked';revision:number;code:string;verificationUrl:string;issuedAt:string;revokedAt:string|null;sha256:string;locale:'es'|'en'}
export interface CertificatePage {data:CertificateSummary[];total:number;limit:number;offset:number}
export interface CertificateHistory {id:string;action:string;actorName:string;reason:string;createdAt:string}
export interface CertificateDetail {certificate:CertificateSummary;history:CertificateHistory[]}
export interface PublicCertificate {name:string;event:string;title:string;participation:string;subjectTitle:string;status:'issued'|'revoked';code:string;issuedAt:string;revokedAt:string|null;sha256:string}
