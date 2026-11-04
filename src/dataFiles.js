import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const BACKUP_FORMAT = 'volleyscout-backup';
const BACKUP_VERSION = 1;
const APP_NAME = 'VolleyScout';

const two = value => String(value).padStart(2, '0');

export function fileDateStamp(date = new Date()) {
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadBackup(data) {
  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: APP_NAME,
    exportedAt: new Date().toISOString(),
    data,
  };
  const filename = `volleyscout-backup-${fileDateStamp()}.json`;
  downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), filename);
  return filename;
}

export async function parseBackupFile(file) {
  if (!file) throw new Error('Seleziona un file di backup.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Il backup è troppo grande (massimo 25 MB).');

  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Il file non contiene un backup JSON valido.');
  }

  if (parsed?.format !== BACKUP_FORMAT || !parsed?.data) {
    throw new Error('Formato backup non riconosciuto. Seleziona un file esportato da VolleyScout.');
  }

  const data = parsed.data;
  if (!data.team || typeof data.team.name !== 'string' || !data.team.name.trim()) {
    throw new Error('Il backup non contiene una società valida.');
  }
  ['players', 'events', 'fixtures', 'competitions'].forEach(key => {
    if (!Array.isArray(data[key])) throw new Error(`Il backup non contiene la sezione "${key}".`);
  });

  return {
    team: data.team,
    players: data.players,
    events: data.events,
    fixtures: data.fixtures,
    competitions: data.competitions,
    theme: data.theme === 'light' ? 'light' : 'dark',
    exportedAt: parsed.exportedAt || null,
  };
}

function pdfText(value) {
  return String(value ?? '')
    .replace(/[—–]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x00-\xFF]/g, '');
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('it-IT');
}

function formatDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function loadImageAsPng(source, size = 256) {
  return new Promise((resolve, reject) => {
    if (!source) return reject(new Error('Immagine non disponibile.'));
    const image = new Image();
    image.onerror = () => reject(new Error('Impossibile caricare l’immagine.'));
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Impossibile elaborare l’immagine.'));
      const scale = Math.min(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    image.src = source;
  });
}

function addFooters(doc, margin, pageHeight, label = 'VolleyScout - Report dati') {
  const pages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 231, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, 210 - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(130, 138, 154);
    doc.text(label, margin, pageHeight - 7);
    doc.text(`Pagina ${page} di ${pages}`, 210 - margin, pageHeight - 7, { align: 'right' });
  }
}

function sectionTitle(doc, title, subtitle, y, margin, pageWidth) {
  if (y > 252) {
    doc.addPage();
    y = 22;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(19, 26, 43);
  doc.text(pdfText(title), margin, y);
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 138, 154);
    doc.text(pdfText(subtitle), pageWidth - margin, y, { align: 'right' });
  }
  doc.setDrawColor(226, 231, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 3, pageWidth - margin, y + 3);
  return y + 8;
}

const tableStyles = {
  theme: 'grid',
  styles: {
    font: 'helvetica',
    fontSize: 7.5,
    cellPadding: 2,
    textColor: [45, 55, 75],
    lineColor: [231, 235, 243],
    lineWidth: 0.15,
  },
  headStyles: {
    fillColor: [106, 90, 224],
    textColor: [255, 255, 255],
    fontStyle: 'bold',
    fontSize: 7.5,
  },
  alternateRowStyles: { fillColor: [248, 249, 253] },
  margin: { left: 14, right: 14, top: 20, bottom: 18 },
};

export async function exportDataPdf({ team, players, events, fixtures, competitions, roleLabels, grades, fundamentals }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const [appLogo, teamLogo] = await Promise.all([
    loadImageAsPng('/logo.png', 192).catch(() => null),
    team.logo ? loadImageAsPng(team.logo, 256).catch(() => null) : Promise.resolve(null),
  ]);

  const points = events.filter(event => event.grade === '#').length;
  const errors = events.filter(event => event.grade === '=').length;
  const attack = events.filter(event => event.fundamental === 'Attack');
  const attackPoints = attack.filter(event => event.grade === '#').length;
  const attackErrors = attack.filter(event => event.grade === '=').length;
  const efficiency = attack.length ? Math.round(((attackPoints - attackErrors) / attack.length) * 100) : 0;
  const playerStats = players.map(player => {
    const list = events.filter(event => event.player === player.number);
    const playerAttacks = list.filter(event => event.fundamental === 'Attack');
    const playerPoints = list.filter(event => event.grade === '#').length;
    const playerErrors = list.filter(event => event.grade === '=').length;
    const playerEfficiency = playerAttacks.length
      ? Math.round(((playerAttacks.filter(event => event.grade === '#').length - playerAttacks.filter(event => event.grade === '=').length) / playerAttacks.length) * 100)
      : 0;
    return { ...player, actions: list.length, points: playerPoints, errors: playerErrors, efficiency: playerEfficiency };
  });
  const fixtureById = new Map(fixtures.map(fixture => [fixture.id, fixture]));
  const competitionById = new Map(competitions.map(competition => [competition.id, competition]));

  // Intestazione
  doc.setFillColor(15, 23, 40);
  doc.roundedRect(margin, 12, contentWidth, 28, 4, 4, 'F');
  if (appLogo) doc.addImage(appLogo, 'PNG', margin + 4, 17, 18, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text('VolleyScout', margin + 27, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(190, 198, 215);
  doc.text('Report dati società', margin + 27, 30);
  doc.setFontSize(7.5);
  doc.text(`Generato il ${formatDateTime()}`, pageWidth - margin - 4, 22, { align: 'right' });
  doc.text('Documento leggibile', pageWidth - margin - 4, 28, { align: 'right' });

  let y = 47;

  // Identità della società
  if (teamLogo) {
    doc.addImage(teamLogo, 'PNG', margin, y, 20, 20);
  }
  const teamTextX = margin + (teamLogo ? 25 : 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(19, 26, 43);
  doc.text(pdfText(team.name), teamTextX, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(115, 124, 145);
  doc.text('Società, roster, partite e statistiche', teamTextX, y + 14);
  y += 27;

  // Riepilogo numerico
  const stats = [
    ['Atlete', players.length],
    ['Partite', fixtures.length],
    ['Azioni', events.length],
    ['Campionati', competitions.length],
  ];
  const gap = 3;
  const cardWidth = (contentWidth - gap * (stats.length - 1)) / stats.length;
  const cardHeight = 18;
  stats.forEach(([label, value], index) => {
    const x = margin + index * (cardWidth + gap);
    doc.setFillColor(245, 247, 252);
    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 130, 150);
    doc.text(label, x + 4, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(19, 26, 43);
    doc.text(String(value), x + 4, y + 14);
  });
  y += cardHeight + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 90, 110);
  doc.text(`Punti diretti: ${points}   ·   Errori: ${errors}   ·   Efficienza attacco: ${efficiency}%`, margin, y + 2);
  y += 12;

  // Roster e statistiche individuali
  y = sectionTitle(doc, 'Roster', `${players.length} atlete`, y, margin, pageWidth);
  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [['N°', 'Giocatrice', 'Ruolo', 'Nascita', 'Azioni', 'Punti', 'Errori', 'Eff. attacco']],
    body: playerStats.length
      ? playerStats.map(player => [
        String(player.number),
        pdfText(player.name),
        pdfText(roleLabels[player.role] || player.role),
        formatDate(player.birthDate),
        String(player.actions),
        String(player.points),
        String(player.errors),
        `${player.efficiency}%`,
      ])
      : [['-', 'Nessuna atleta nel roster', '-', '-', '-', '-', '-', '-']],
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 23, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 22, halign: 'center' },
    },
  });
  y = (doc.lastAutoTable?.finalY || y) + 12;

  // Partite
  y = sectionTitle(doc, 'Partite e campionati', `${fixtures.length} partite`, y, margin, pageWidth);
  const sortedFixtures = [...fixtures].sort((a, b) => new Date(a.date) - new Date(b.date));
  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [['Data', 'Campionato', 'Incontro', 'Stato']],
    body: sortedFixtures.length
      ? sortedFixtures.map(fixture => [
        formatDate(fixture.date),
        pdfText(competitionById.get(fixture.competitionId)?.name || '-'),
        pdfText(`${fixture.home} vs ${fixture.away}`),
        pdfText(fixture.status || 'programmata'),
      ])
      : [['-', '-', 'Nessuna partita registrata', '-']],
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 55 },
      3: { cellWidth: 27, halign: 'center' },
    },
  });
  y = (doc.lastAutoTable?.finalY || y) + 12;

  // Registro completo delle azioni
  y = sectionTitle(doc, 'Registro azioni', `${events.length} azioni`, y, margin, pageWidth);
  if (events.length) {
    autoTable(doc, {
      ...tableStyles,
      startY: y,
      head: [['Data', 'Atleta', 'Fondamentale', 'Esito', 'Zona', 'Partita']],
      body: events.map(event => {
        const player = players.find(item => item.number === event.player);
        const fixture = fixtureById.get(event.fixtureId);
        return [
          formatDateTime(event.time),
          pdfText(player?.name || `#${event.player}`),
          pdfText(fundamentals.find(item => item.key === event.fundamental)?.label || event.fundamental),
          pdfText(grades[event.grade]?.[0] || event.grade),
          `Z${event.zone}`,
          pdfText(fixture ? `${fixture.home} vs ${fixture.away}` : '-'),
        ];
      }),
      columnStyles: {
        0: { cellWidth: 31 },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 55 },
      },
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(115, 124, 145);
    doc.text('Nessuna azione registrata.', margin, y + 5);
  }

  addFooters(doc, margin, pageHeight);
  doc.save(`volleyscout-report-${fileDateStamp()}.pdf`);
}

function makePdf() {
  return new jsPDF({ unit: 'mm', format: 'a4', compress: true });
}

function drawAppHeader(doc, { title, subtitle, appLogo }) {
  const margin = 14;
  const contentWidth = 182;
  doc.setFillColor(15, 23, 40);
  doc.roundedRect(margin, 12, contentWidth, 28, 4, 4, 'F');
  if (appLogo) doc.addImage(appLogo, 'PNG', margin + 4, 17, 18, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text('VolleyScout', margin + 27, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(190, 198, 215);
  doc.text(pdfText(subtitle), margin + 27, 30);
  doc.setFontSize(7.5);
  doc.text(`Generato il ${formatDateTime()}`, 192, 22, { align: 'right' });
  doc.text(pdfText(title), 192, 28, { align: 'right' });
  return 47;
}

function drawIdentity(doc, { y, image, name, subtitle, meta }) {
  const margin = 14;
  let textX = margin;
  if (image) {
    doc.addImage(image, 'PNG', margin, y, 20, 20);
    textX = margin + 25;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(19, 26, 43);
  doc.text(pdfText(name), textX, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(115, 124, 145);
  doc.text(pdfText(subtitle), textX, y + 14);
  if (meta) {
    doc.setFontSize(8);
    doc.text(pdfText(meta), textX, y + 19.5);
  }
  return y + 27;
}

function drawStatCards(doc, y, items) {
  const margin = 14;
  const contentWidth = 182;
  const gap = 3;
  const cardWidth = (contentWidth - gap * (items.length - 1)) / items.length;
  const cardHeight = 18;
  items.forEach(([label, value], index) => {
    const x = margin + index * (cardWidth + gap);
    doc.setFillColor(245, 247, 252);
    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 130, 150);
    doc.text(pdfText(label), x + 4, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(19, 26, 43);
    doc.text(String(value), x + 4, y + 14);
  });
  return y + cardHeight;
}

function totalsOf(events) {
  const attack = events.filter(event => event.fundamental === 'Attack');
  const points = events.filter(event => event.grade === '#').length;
  const errors = events.filter(event => event.grade === '=').length;
  const attackPoints = attack.filter(event => event.grade === '#').length;
  const attackErrors = attack.filter(event => event.grade === '=').length;
  return {
    total: events.length,
    points,
    errors,
    efficiency: attack.length ? Math.round(((attackPoints - attackErrors) / attack.length) * 100) : 0,
  };
}

function playerTotals(players, events) {
  return players
    .map(player => {
      const totals = totalsOf(events.filter(event => event.player === player.number));
      return {
        ...player,
        actions: totals.total,
        points: totals.points,
        errors: totals.errors,
        efficiency: totals.efficiency,
      };
    })
    .sort((a, b) => b.points - a.points || b.actions - a.actions);
}

function fundamentalRows(events, fundamentals) {
  return fundamentals.map(fundamental => {
    const list = events.filter(event => event.fundamental === fundamental.key);
    const points = list.filter(event => event.grade === '#').length;
    const errors = list.filter(event => event.grade === '=').length;
    const percentage = list.length ? Math.round((points / list.length) * 100) : 0;
    return [
      pdfText(fundamental.label),
      String(list.length),
      String(points),
      String(errors),
      `${percentage}%`,
    ];
  });
}

function formatFixtureDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function slug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'report';
}

function descendingByTime(events) {
  return [...events].sort((a, b) => Number(b.time || 0) - Number(a.time || 0));
}

function eventRow(event, { players, fixtureById, fundamentals, grades }) {
  const player = players.find(item => item.number === event.player);
  const fixture = fixtureById.get(event.fixtureId);
  return [
    formatDateTime(event.time),
    pdfText(player?.name || `#${event.player}`),
    pdfText(fundamentals.find(item => item.key === event.fundamental)?.label || event.fundamental),
    pdfText(grades[event.grade]?.[0] || event.grade),
    `Z${event.zone}`,
    pdfText(fixture ? `${fixture.home} vs ${fixture.away}` : '-'),
  ];
}

export async function exportMatchPdf({ team, players, events, fixtures, competitions, fixture, roleLabels, grades, fundamentals }) {
  if (!fixture) throw new Error('Seleziona una gara da esportare.');

  const margin = 14;
  const pageHeight = 297;
  const pageWidth = 210;
  const matchEvents = descendingByTime(events.filter(event => event.fixtureId === fixture.id));
  const totals = totalsOf(matchEvents);
  const competition = competitions.find(item => item.id === fixture.competitionId);
  const involved = new Set(matchEvents.map(event => event.player)).size;
  const fixtureById = new Map(fixtures.map(item => [item.id, item]));

  const doc = makePdf();
  const [appLogo, teamLogo] = await Promise.all([
    loadImageAsPng('/logo.png', 192).catch(() => null),
    team.logo ? loadImageAsPng(team.logo, 256).catch(() => null) : Promise.resolve(null),
  ]);

  let y = drawAppHeader(doc, { title: 'Report gara', subtitle: 'Statistiche della partita', appLogo });
  y = drawIdentity(doc, {
    y,
    image: teamLogo,
    name: `${fixture.home} vs ${fixture.away}`,
    subtitle: `${competition?.name || 'Amichevole'} · ${fixture.status || 'programmata'}`,
    meta: formatFixtureDate(fixture.date),
  });
  y = drawStatCards(doc, y, [
    ['Azioni', totals.total],
    ['Punti diretti', totals.points],
    ['Errori', totals.errors],
    ['Eff. attacco', `${totals.efficiency}%`],
  ]) + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 90, 110);
  doc.text(`${involved} giocatrici coinvolte · ${players.length} atlete nel roster`, margin, y + 2);
  y += 12;

  y = sectionTitle(doc, 'Statistiche giocatrici', `${involved} atlete coinvolte`, y, margin, pageWidth);
  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [['N°', 'Giocatrice', 'Ruolo', 'Azioni', 'Punti', 'Errori', 'Eff. attacco']],
    body: players.length
      ? playerTotals(players, matchEvents).map(player => [
        String(player.number),
        pdfText(player.name),
        pdfText(roleLabels[player.role] || player.role),
        String(player.actions),
        String(player.points),
        String(player.errors),
        `${player.efficiency}%`,
      ])
      : [['-', 'Nessuna atleta nel roster', '-', '-', '-', '-', '-']],
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 24, halign: 'center' },
    },
  });
  y = (doc.lastAutoTable?.finalY || y) + 12;

  y = sectionTitle(doc, 'Prestazioni per fondamentale', fundamentals.length + ' gesti tecnici', y, margin, pageWidth);
  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [['Fondamentale', 'Azioni', 'Punti', 'Errori', '% punto']],
    body: fundamentalRows(matchEvents, fundamentals),
    columnStyles: {
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' },
    },
  });
  y = (doc.lastAutoTable?.finalY || y) + 12;

  y = sectionTitle(doc, 'Registro azioni', `${matchEvents.length} azioni`, y, margin, pageWidth);
  if (matchEvents.length) {
    autoTable(doc, {
      ...tableStyles,
      startY: y,
      head: [['Data', 'Atleta', 'Fondamentale', 'Esito', 'Zona', 'Partita']],
      body: matchEvents.map(event => eventRow(event, { players, fixtureById, fundamentals, grades })),
      columnStyles: {
        0: { cellWidth: 31 },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 55 },
      },
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(115, 124, 145);
    doc.text('Nessuna azione registrata per questa gara.', margin, y + 5);
  }

  addFooters(doc, margin, pageHeight);
  const dateStamp = Number.isNaN(new Date(fixture.date).getTime()) ? fileDateStamp() : fileDateStamp(new Date(fixture.date));
  doc.save(`volleyscout-gara-${dateStamp}-${slug(fixture.home)}-vs-${slug(fixture.away)}.pdf`);
}

export async function exportPlayerPdf({ team, player, players, events, fixtures, competitions, roleLabels, grades, fundamentals }) {
  if (!player) throw new Error('Seleziona una giocatrice da esportare.');

  const margin = 14;
  const pageHeight = 297;
  const pageWidth = 210;
  const playerEvents = descendingByTime(events.filter(event => event.player === player.number));
  const totals = totalsOf(playerEvents);
  const fixtureById = new Map(fixtures.map(fixture => [fixture.id, fixture]));

  const byFixture = new Map();
  playerEvents.forEach(event => {
    const key = event.fixtureId || 'none';
    if (!byFixture.has(key)) byFixture.set(key, []);
    byFixture.get(key).push(event);
  });
  const matchRows = [...byFixture.entries()]
    .map(([fixtureId, list]) => {
      const fixture = fixtureById.get(fixtureId);
      const stats = totalsOf(list);
      return {
        date: fixture?.date || 0,
        fixture,
        stats,
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(({ fixture, stats }) => [
      formatDate(fixture?.date),
      pdfText(fixture ? `${fixture.home} vs ${fixture.away}` : 'Senza partita'),
      String(stats.total),
      String(stats.points),
      String(stats.errors),
      `${stats.efficiency}%`,
    ]);

  const doc = makePdf();
  const [appLogo, teamLogo, playerPhoto] = await Promise.all([
    loadImageAsPng('/logo.png', 192).catch(() => null),
    team.logo ? loadImageAsPng(team.logo, 256).catch(() => null) : Promise.resolve(null),
    player.photo ? loadImageAsPng(player.photo, 256).catch(() => null) : Promise.resolve(null),
  ]);

  let y = drawAppHeader(doc, { title: 'Report atleta', subtitle: 'Statistiche individuali', appLogo });

  // Identità: logo società a sinistra e foto atleta a destra del nome.
  let identityX = margin;
  if (teamLogo) {
    doc.addImage(teamLogo, 'PNG', identityX, y, 14, 14);
    identityX += 18;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(115, 124, 145);
  doc.text(pdfText(team.name), identityX, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(19, 26, 43);
  doc.text(pdfText(`${player.number} · ${player.name}`), identityX, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(115, 124, 145);
  const profile = [
    roleLabels[player.role] || player.role,
    player.birthDate ? `nata il ${formatDate(player.birthDate)}` : null,
    `${playerEvents.length} azioni registrate`,
  ].filter(Boolean).join(' · ');
  doc.text(pdfText(profile), identityX, y + 19);
  if (playerPhoto) {
    doc.addImage(playerPhoto, 'PNG', pageWidth - margin - 20, y - 1, 20, 20);
  }
  y += 28;

  y = drawStatCards(doc, y, [
    ['Azioni', totals.total],
    ['Punti diretti', totals.points],
    ['Errori', totals.errors],
    ['Eff. attacco', `${totals.efficiency}%`],
  ]) + 12;

  y = sectionTitle(doc, 'Prestazioni per fondamentale', fundamentals.length + ' gesti tecnici', y, margin, pageWidth);
  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [['Fondamentale', 'Azioni', 'Punti', 'Errori', '% punto']],
    body: fundamentalRows(playerEvents, fundamentals),
    columnStyles: {
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' },
    },
  });
  y = (doc.lastAutoTable?.finalY || y) + 12;

  y = sectionTitle(doc, 'Prestazioni per partita', `${matchRows.length} gare`, y, margin, pageWidth);
  if (matchRows.length) {
    autoTable(doc, {
      ...tableStyles,
      startY: y,
      head: [['Data', 'Incontro', 'Azioni', 'Punti', 'Errori', 'Eff. attacco']],
      body: matchRows,
      columnStyles: {
        0: { cellWidth: 24, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 24, halign: 'center' },
      },
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(115, 124, 145);
    doc.text('Nessuna gara con azioni registrate.', margin, y + 5);
  }
  y = (doc.lastAutoTable?.finalY || y) + 12;

  y = sectionTitle(doc, 'Registro azioni', `${playerEvents.length} azioni`, y, margin, pageWidth);
  if (playerEvents.length) {
    autoTable(doc, {
      ...tableStyles,
      startY: y,
      head: [['Data', 'Fondamentale', 'Esito', 'Zona', 'Partita']],
      body: playerEvents.map(event => {
        const fixture = fixtureById.get(event.fixtureId);
        return [
          formatDateTime(event.time),
          pdfText(fundamentals.find(item => item.key === event.fundamental)?.label || event.fundamental),
          pdfText(grades[event.grade]?.[0] || event.grade),
          `Z${event.zone}`,
          pdfText(fixture ? `${fixture.home} vs ${fixture.away}` : '-'),
        ];
      }),
      columnStyles: {
        0: { cellWidth: 31 },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 70 },
      },
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(115, 124, 145);
    doc.text('Nessuna azione registrata per questa atleta.', margin, y + 5);
  }

  addFooters(doc, margin, pageHeight, `VolleyScout - Report atleta · #${player.number} ${player.name}`);
  doc.save(`volleyscout-atleta-${player.number}-${slug(player.name)}.pdf`);
}
