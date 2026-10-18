import type {Metadata} from 'next';
import {Brand} from '@sep/ui';
import {posterData,type PosterProps} from './poster-data';
import PosterList from './poster-list';
export const dynamic='force-dynamic';
export async function generateMetadata(props:PosterProps):Promise<Metadata>{const d=await posterData(props);return {title:d.locale==='es'?'Galería de pósteres':'Poster gallery',robots:d.binding.config?{index:false,follow:false}:undefined};}
export default async function Posters(props:PosterProps){const d=await posterData(props),es=d.locale==='es';return <main className="public-section poster-page"><a href={`/${d.locale}${d.query}`}><Brand/></a><p>{es?d.site.event.nameEs:d.site.event.nameEn}</p><h1>{es?'Galería de pósteres':'Poster gallery'}</h1><p>{es?'Contribuciones finales autorizadas por sus autores y aprobadas para su exposición pública.':'Final contributions authorized by their authors and approved for public display.'}</p>{'data'in d.value&&<PosterList posters={d.value.data} locale={es?'es':'en'} query={d.query}/>}</main>;}
