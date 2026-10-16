export function validOrcid(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(value)) return false;
  const digits=value.replaceAll('-',''); let total=0;
  for(const digit of digits.slice(0,15)) total=(total+Number(digit))*2;
  const check=(12-total%11)%11;
  return digits[15]===(check===10?'X':String(check));
}
