export const siteContents = {
  a1: {
    acronym: 'BIOSFERA 26', theme: 'forest', kickerEs: 'II Encuentro de ciencia y sostenibilidad', kickerEn: '2nd Meeting on science and sustainability',
    heroTitleEs: 'La ciencia que\nnos conecta.', heroTitleEn: 'Science that\nbrings us together.',
    summaryEs: 'Tres días para conectar disciplinas, compartir nuevas miradas y pensar juntos el futuro de nuestro planeta.',
    summaryEn: 'Three days to connect disciplines, share fresh perspectives, and think together about the future of our planet.',
    aboutEs: 'La ciencia avanza cuando las ideas se encuentran. Biosfera reúne a una comunidad interesada en comprender los desafíos ambientales desde una perspectiva abierta, colaborativa y humana.\n\nEste encuentro de demostración propone conversaciones entre disciplinas y un espacio para compartir preguntas, métodos y experiencias.',
    aboutEn: 'Science moves forward when ideas meet. Biosfera brings together a community interested in understanding environmental challenges through an open, collaborative, and human perspective.\n\nThis demonstration meeting proposes conversations across disciplines and a space to share questions, methods, and experiences.',
    callEs: 'Invitamos a explorar los ejes temáticos del encuentro y conversar con la organización sobre propuestas de investigación y experiencias de trabajo.\n\nEsta es una convocatoria ilustrativa. La recepción y evaluación de contribuciones se incorporarán en la fase científica del sistema.',
    callEn: 'We invite you to explore the meeting’s themes and contact the organizers about research proposals and working experiences.\n\nThis is an illustrative call. Submission and review workflows will be added in the platform’s scientific phase.',
    venueEs: 'Centro de Encuentros · La Habana, Cuba', venueEn: 'Meeting Center · Havana, Cuba',
    startDate: '2026-11-18', endDate: '2026-11-20', contactEmail: 'biosfera@eventos.example',
    topicsEs: ['Salud planetaria', 'Sistemas resilientes', 'Ciencia abierta', 'Futuros compartidos'],
    topicsEn: ['Planetary health', 'Resilient systems', 'Open science', 'Shared futures'],
  },
  b1: {
    acronym: 'HORIZONTES 26', theme: 'ocean', kickerEs: 'Foro de investigación marina', kickerEn: 'Marine research forum',
    heroTitleEs: 'Un océano de\nnuevas ideas.', heroTitleEn: 'An ocean of\nnew ideas.',
    summaryEs: 'Un encuentro para ampliar horizontes, conectar investigación y descubrir nuevas formas de comprender el mundo azul.',
    summaryEn: 'A meeting to broaden horizons, connect research, and discover new ways of understanding our blue world.',
    aboutEs: 'El océano conecta territorios, comunidades y preguntas que aún esperan respuesta. Horizontes Azules abre un espacio de conversación sobre investigación marina y el cuidado de los ecosistemas costeros.\n\nUn evento ficticio con identidad propia, dentro de la misma plataforma y con permisos independientes.',
    aboutEn: 'The ocean connects territories, communities, and questions still waiting for answers. Blue Horizons opens a space for conversation about marine research and the care of coastal ecosystems.\n\nA fictional event with its own identity, within the same platform and with independent permissions.',
    callEs: 'La organización invita a conocer las líneas del foro y a compartir preguntas sobre cooperación científica y ecosistemas marinos.\n\nEl contenido es de demostración y no constituye una convocatoria real.',
    callEn: 'The organizers invite you to discover the forum’s themes and share questions about scientific cooperation and marine ecosystems.\n\nThis demonstration content does not constitute a real call for contributions.',
    venueEs: 'Casa de la Ciencia · Cienfuegos, Cuba', venueEn: 'Science House · Cienfuegos, Cuba',
    startDate: '2026-12-02', endDate: '2026-12-04', contactEmail: 'horizontes@eventos.example',
    topicsEs: ['Biodiversidad marina', 'Costas vivas', 'Observación oceánica', 'Cooperación científica'],
    topicsEn: ['Marine biodiversity', 'Living coasts', 'Ocean observation', 'Scientific cooperation'],
  },
};

export async function seedSites(pool, fixture, visual = false) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    if (visual) {
      await c.query("UPDATE events SET name_es='Biosfera 2026',name_en='Biosfera 2026',status='published' WHERE id=$1", [fixture.events.a1]);
      await c.query("UPDATE events SET name_es='Ciencia Abierta 2027',name_en='Open Science 2027' WHERE id=$1", [fixture.events.a2]);
      await c.query("UPDATE events SET name_es='Horizontes Azules 2026',name_en='Blue Horizons 2026' WHERE id=$1", [fixture.events.b1]);
    }
    for (const [key, content] of Object.entries(siteContents)) {
      const event = (await c.query('SELECT id, organization_id, name_es, name_en, timezone, status FROM events WHERE id=$1', [fixture.events[key]])).rows[0];
      await c.query('INSERT INTO site_drafts (organization_id,event_id,content,revision) VALUES ($1,$2,$3,1)', [event.organization_id, event.id, content]);
      if (event.status === 'published') {
        const now = new Date().toISOString();
        const snapshot = { event: { id: event.id, nameEs: event.name_es, nameEn: event.name_en, timezone: event.timezone }, content, revision: 1, publishedAt: now };
        await c.query('INSERT INTO site_publications (organization_id,event_id,snapshot,revision,published_at) VALUES ($1,$2,$3,1,$4)', [event.organization_id, event.id, snapshot, now]);
      }
    }
    await c.query('COMMIT');
  } catch (error) { await c.query('ROLLBACK'); throw error; }
  finally { c.release(); }
}
