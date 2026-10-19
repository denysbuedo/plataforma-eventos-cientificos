import type {Locale} from '@sep/i18n';
import {webCopy} from '@sep/i18n';
import type {IconName} from '@sep/ui';
import {reviewCopy} from './peer-review-copy';
import {programCopy} from './program-copy';
import {registrationCopy} from './registration-common';
import {certificateCopy} from './certificates-common';
import {communicationCopy} from './communications-common';
import {editorialCopy} from './editorial-common';
import {sponsorshipCopy} from './sponsorship-common';
export function eventManagementNavigation(locale:Locale):{id:string;label:string;icon:IconName}[]{
 const text=webCopy[locale],es=locale==='es';
 return [
 {id:'overview',label:es?'Gestionar evento':'Manage event',icon:'settings'},
 {id:'submissions',label:text.receivedWorks,icon:'book'},
 {id:'review',label:reviewCopy[locale].committee,icon:'check'},
 {id:'program',label:programCopy[locale].title,icon:'calendar'},
 {id:'registrations',label:registrationCopy[locale].title,icon:'check'},
 {id:'certification',label:certificateCopy[locale].title,icon:'book'},
 {id:'communications',label:communicationCopy[locale].title,icon:'book'},
 {id:'editorial',label:editorialCopy[locale].title,icon:'book'},
 {id:'payments-admin',label:es?'Cobros y pagos':'Charges and payments',icon:'check'},
 {id:'operations',label:es?'Logística y sesiones':'Logistics and sessions',icon:'calendar'},
 {id:'gallery',label:es?'Galería de pósteres':'Poster gallery',icon:'book'},
 {id:'reports',label:es?'Indicadores e informes':'Indicators and reports',icon:'grid'},
 {id:'sponsorship',label:sponsorshipCopy[locale].title,icon:'globe'},
 {id:'call',label:text.scientificCall,icon:'book'},
 {id:'content',label:text.content,icon:'edit'},
 {id:'appearance',label:text.appearance,icon:'palette'},
 {id:'data',label:text.eventData,icon:'settings'}
 ];
}
