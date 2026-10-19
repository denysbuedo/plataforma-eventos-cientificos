import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
const N=131072,r=8,p=1;
let running=0;
export function validLocalPassword(password:string){return Array.from(password).length>=15&&Array.from(password).length<=128&&!/^\s+$/.test(password)&&!/^(.)(\1)+$/u.test(password);}
async function derive(password:string,salt:Buffer):Promise<Buffer>{
 if(running>=2)throw new Error('PASSWORD_CAPACITY');running++;
 try{return await new Promise((resolve,reject)=>scrypt(password,salt,64,{N,r,p,maxmem:192*1024*1024},(error,key)=>error?reject(error):resolve(key)));}finally{running--;}
}
export async function hashLocalPassword(password:string){const salt=randomBytes(16),key=await derive(password,salt);return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${key.toString('hex')}`;}
export async function verifyLocalPassword(password:string,stored?:string){
 const parts=stored?.split('$'),valid=parts?.length===6&&parts[0]==='scrypt'&&parts[1]===String(N)&&parts[2]===String(r)&&parts[3]===String(p)&&/^[a-f0-9]{32}$/.test(parts[4])&&/^[a-f0-9]{128}$/.test(parts[5]);
 const actual=await derive(password,valid?Buffer.from(parts![4],'hex'):Buffer.alloc(16,0x37));
 return !!valid&&timingSafeEqual(actual,Buffer.from(parts![5],'hex'));
}
