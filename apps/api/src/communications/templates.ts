export const notificationTemplates = {
 'work.decision': ['Tienes un dictamen sobre tu trabajo', 'A decision is available for your submission'],
 'review.released': ['Ya puedes consultar los comentarios de revisión', 'Reviewer comments are available'],
 'work.submitted': ['Se ha recibido una versión de un trabajo', 'A submission version has been received'],
 'work.withdrawn': ['Un trabajo ha sido retirado', 'A submission has been withdrawn'],
 'review.member.invited': ['Te han invitado al comité de revisión', 'You have been invited to the review committee'],
 'review.assigned': ['Tienes una nueva revisión asignada', 'You have a new review assignment'],
 'review.assignment.revoked': ['Se ha revocado una asignación de revisión', 'A review assignment has been revoked'],
 'review.deadline.extended': ['Se ha ampliado un plazo de revisión', 'A review deadline has been extended'],
 'review.submitted': ['Se ha recibido una evaluación', 'A review has been submitted'],
 'review.response.available': ['El autor respondió a tu evaluación', 'The author has responded to your review'],
 'review.response.assessed': ['Un revisor valoró la respuesta del autor', 'A reviewer assessed an author response'],
 'registration.requested': ['Se ha recibido una solicitud de inscripción', 'A registration request has been received'],
 'registration.decided': ['Se ha actualizado tu inscripción', 'Your registration has been updated'],
 'program.published': ['El programa científico ha sido publicado o actualizado', 'The scientific programme has been published or updated'],
 'program.withdrawn': ['El programa científico ha sido retirado temporalmente', 'The scientific programme has been temporarily withdrawn'],
 'certificate.issued': ['Tienes un certificado disponible', 'Your certificate is available'],
 'certificate.revoked': ['Se ha revocado un certificado a tu nombre', 'A certificate issued to you has been revoked'],
 'announcement': ['Nueva comunicación del evento', 'New event announcement'],
} as const;
export type NotificationKind = keyof typeof notificationTemplates;
export function notificationTitle(kind:string,locale:'es'|'en') {
 const values=notificationTemplates[kind as NotificationKind]??notificationTemplates.announcement;
 return values[locale==='es'?0:1];
}
const escapeHtml=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderNotificationMail(value:{kind:string;locale:'es'|'en';eventName:string;message:string;url:string}) {
 const subject=notificationTitle(value.kind,value.locale),open=value.locale==='es'?'Consultar en SEP':'Open in SEP';
 const privacy=value.locale==='es'?'Consulta los detalles en tu cuenta. Este correo no contiene evaluaciones privadas ni archivos adjuntos.':'Sign in to view the details. This email contains no private evaluations or attachments.';
 return {subject:`${value.eventName} · ${subject}`,text:[subject,value.eventName,value.message,privacy,`${open}: ${value.url}`].filter(Boolean).join('\n\n'),html:`<!doctype html><html lang="${value.locale}"><body><h1>${escapeHtml(subject)}</h1><p>${escapeHtml(value.eventName)}</p>${value.message?`<p>${escapeHtml(value.message).replace(/\n/g,'<br>')}</p>`:''}<p>${escapeHtml(privacy)}</p><p><a href="${escapeHtml(value.url)}">${open}</a></p></body></html>`};
}
