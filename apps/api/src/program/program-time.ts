// Resolve local wall times without guessing through daylight-saving gaps or repeated hours.
export function programClock(timezone:string){
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),offsets=new Map<string,number[]>(),cache=new Map<string,boolean>();
 const local=(instant:number)=>{const parts=formatter.formatToParts(new Date(instant)),part=(key:string)=>parts.find(p=>p.type===key)!.value;return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;};
 return (date:string,time:string)=>{const key=date+'T'+time;if(cache.has(key))return cache.get(key)!;const target=Date.parse(key+':00Z');if(!Number.isFinite(target))return false;
  if(!offsets.has(date)){const noon=Date.parse(date+'T12:00:00Z');offsets.set(date,[...new Set([-86400000,0,86400000].map(delta=>Date.parse(local(noon+delta)+':00Z')-(noon+delta)))]);}
  const matches=offsets.get(date)!.filter(offset=>local(target-offset)===key).length,valid=matches===1;cache.set(key,valid);return valid;
 };
}
