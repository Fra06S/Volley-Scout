import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  ClipboardList,
  Crosshair,
  DatabaseBackup,
  Download,
  FileText,
  Flame,
  Gauge,
  Hand,
  ImagePlus,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  Users,
  Volleyball,
  Wind,
  X,
} from 'lucide-react';
import './styles.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

const initialPlayers = [];
const playerColors = ['#6a5ae0', '#f08a5d', '#18b981', '#3b82f6', '#e6a13a', '#e85d6a', '#14b8a6', '#8b5cf6'];

const roleLabels = {
  P: 'Palleggiatrice',
  O: 'Opposto',
  S: 'Schiacciatrice',
  C: 'Centrale',
  L: 'Libero',
};

const fundamentals = [
  { key: 'Serve', label: 'Battuta', icon: Wind, tones: ['#', '=', '+', '/'] },
  { key: 'Reception', label: 'Ricezione', icon: Hand, tones: ['#', '+', '-', '='] },
  { key: 'Set', label: 'Alzata', icon: Volleyball, tones: ['#', '+', '-', '='] },
  { key: 'Attack', label: 'Attacco', icon: Flame, tones: ['#', '+', '-', '='] },
  { key: 'Block', label: 'Muro', icon: ShieldCheck, tones: ['#', '+', '-', '='] },
  { key: 'Defense', label: 'Difesa', icon: Crosshair, tones: ['#', '+', '-', '='] },
];

const grades = {
  '#': ['Punto / perfetta', 'excellent'],
  '+': ['Positiva', 'positive'],
  '/': ['Neutra', 'neutral'],
  '-': ['Negativa', 'negative'],
  '=': ['Errore', 'error'],
};

const targetZones = [
  { id: 4, x: 18, y: 42 },
  { id: 3, x: 50, y: 42 },
  { id: 2, x: 82, y: 42 },
  { id: 5, x: 18, y: 19 },
  { id: 6, x: 50, y: 19 },
  { id: 1, x: 82, y: 19 },
];

const playerSpots = [
  { id: 4, x: 18, y: 62 },
  { id: 3, x: 50, y: 62 },
  { id: 2, x: 82, y: 62 },
  { id: 5, x: 18, y: 82 },
  { id: 6, x: 50, y: 82 },
  { id: 1, x: 82, y: 82 },
];

const formationZones = [4, 3, 2, 5, 6, 1];

function initialsOf(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'VS';
}

function imageFileToDataURL(file, { size = 320, fit = 'cover' } = {}) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) return reject(new Error('Seleziona un file immagine valido.'));
    if (file.size > 10 * 1024 * 1024) return reject(new Error('L’immagine è troppo grande (massimo 10 MB).'));

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossibile leggere l’immagine.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('L’immagine selezionata non è valida.'));
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) return reject(new Error('Impossibile elaborare l’immagine.'));

        const contentSize = fit === 'contain' ? size * 0.86 : size;
        const scale = fit === 'contain'
          ? Math.min(contentSize / image.width, contentSize / image.height)
          : Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        resolve(canvas.toDataURL('image/webp', 0.84));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function PlayerFace({ player, className = '' }) {
  return (
    <span className={'player-face ' + className} style={{ background: player.color }} title={player.name}>
      {player.photo ? <img src={player.photo} alt="" /> : player.number}
      {player.photo && <small>{player.number}</small>}
    </span>
  );
}

function TeamLogo({ team, className = '' }) {
  return (
    <span className={'team-logo ' + className} title={team.name}>
      {team.logo ? <img src={team.logo} alt="" /> : initialsOf(team.name)}
    </span>
  );
}

function App() {
  // Per una sessione condivisa su tablet, l'accesso viene richiesto a ogni apertura.
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(() => JSON.parse(localStorage.getItem('volley-team-v2') || 'null'));
  const [dark, setDark] = useState(() => localStorage.getItem('volley-theme') !== 'light');
  const [screen, setScreen] = useState('scout');
  const [players, setPlayers] = useState(() => JSON.parse(localStorage.getItem('volley-players-v2') || 'null') || initialPlayers);
  const [events, setEvents] = useState(() => JSON.parse(localStorage.getItem('volley-events-v2') || 'null') || []);
  const [fixtures, setFixtures] = useState(() => JSON.parse(localStorage.getItem('volley-fixtures-v2') || 'null') || []);
  const [competitions, setCompetitions] = useState(() => JSON.parse(localStorage.getItem('volley-competitions-v2') || 'null') || []);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedFundamental, setSelectedFundamental] = useState('Attack');
  const [selectedGrade, setSelectedGrade] = useState('#');
  const [selectedZone, setSelectedZone] = useState(4);
  const [match, setMatch] = useState({ home: '', away: '', set: 1, homeScore: 0, awayScore: 0, serving: 'home' });
  const [sidebar, setSidebar] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('volley-theme', dark ? 'dark' : 'light');
  }, [dark]);
  useEffect(() => localStorage.setItem('volley-events-v2', JSON.stringify(events)), [events]);
  useEffect(() => localStorage.setItem('volley-players-v2', JSON.stringify(players)), [players]);
  useEffect(() => localStorage.setItem('volley-fixtures-v2', JSON.stringify(fixtures)), [fixtures]);
  useEffect(() => localStorage.setItem('volley-competitions-v2', JSON.stringify(competitions)), [competitions]);
  useEffect(() => {
    if (team) localStorage.setItem('volley-team-v2', JSON.stringify(team));
  }, [team]);

  // Mantiene sempre valida la giocatrice selezionata quando il roster cambia.
  useEffect(() => {
    if (!players.some(player => player.number === selectedPlayer)) {
      setSelectedPlayer(players[0]?.number ?? null);
    }
  }, [players, selectedPlayer]);

  const active = fundamentals.find(fundamental => fundamental.key === selectedFundamental);
  const selected = players.find(player => player.number === selectedPlayer);

  const addEvent = () => {
    if (!selected) return;
    const fixtureId = match.fixtureId || fixtures.find(fixture => (
      fixture.status === 'in corso' && fixture.home === match.home && fixture.away === match.away
    ))?.id;
    setEvents(list => [...list, {
      player: selectedPlayer,
      fundamental: selectedFundamental,
      grade: selectedGrade,
      zone: selectedZone,
      fixtureId,
      time: Date.now(),
    }]);
    if (selectedGrade === '#') {
      setMatch(current => ({ ...current, homeScore: current.homeScore + 1, serving: 'home' }));
    }
  };

  const stat = useMemo(() => {
    const attack = events.filter(event => event.fundamental === 'Attack');
    const attackPoints = attack.filter(event => event.grade === '#').length;
    const attackErrors = attack.filter(event => event.grade === '=').length;
    const points = events.filter(event => event.grade === '#').length;
    return {
      total: events.length,
      attack,
      points,
      efficiency: attack.length ? Math.round(((attackPoints - attackErrors) / attack.length) * 100) : 0,
    };
  }, [events]);

  const nav = [
    { key: 'scout', label: 'Live scouting', icon: Activity },
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'player-stats', label: 'Statistiche giocatrici', icon: TrendingUp },
    { key: 'roster', label: 'Squadra & roster', icon: Users },
    { key: 'matches', label: 'Partite', icon: CalendarDays },
    { key: 'reports', label: 'Report', icon: ClipboardList },
  ];

  if (!user) return <Auth onSuccess={setUser} />;
  if (!team) {
    return (
      <TeamSetup
        onCreate={({ name, logo }) => {
          setTeam({ name, ...(logo ? { logo } : {}) });
          setMatch(current => ({ ...current, home: name }));
          setScreen('roster');
        }}
      />
    );
  }

  const logout = () => setUser(null);
  const screenMeta = {
    scout: { label: 'Partita live', title: match.away ? `${team.name} — ${match.away}` : 'Configura una partita' },
    dashboard: { label: 'Dashboard', title: 'Panoramica prestazioni' },
    'player-stats': { label: 'Statistiche', title: 'Statistiche giocatrici' },
    roster: { label: 'Squadra', title: team.name },
    matches: { label: 'Calendario', title: 'Campionati e partite' },
    reports: { label: 'Report', title: 'Report partita' },
    settings: { label: 'Preferenze', title: 'Impostazioni' },
  };
  const meta = screenMeta[screen] || screenMeta.scout;

  return (
    <div className="app-shell">
      <button
        className={'sidebar-scrim ' + (sidebar ? 'shown' : '')}
        aria-label="Chiudi menu"
        onClick={() => setSidebar(false)}
      />
      <aside className={'sidebar ' + (sidebar ? 'shown' : '')}>
        <div className="brand">
          <span className="brand-mark"><img src="/logo.png" alt="" /></span>
          <span className="brand-word">Volley<span>Scout</span></span>
          <button className="icon only-mobile" onClick={() => setSidebar(false)} aria-label="Chiudi menu">
            <X size={18} />
          </button>
        </div>
        <button className="team-switch" onClick={() => setScreen('roster')}>
          <TeamLogo team={team} className={'team-avatar' + (team.logo ? ' has-logo' : '')} />
          <div><b>{team.name}</b><small>La tua squadra</small></div>
          <ChevronRight size={16} />
        </button>
        <span className="nav-label">Menu</span>
        <nav>
          {nav.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={screen === key ? 'active' : ''}
              aria-current={screen === key ? 'page' : undefined}
              onClick={() => { setScreen(key); setSidebar(false); }}
            >
              <Icon size={18} />{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={screen === 'settings' ? 'active' : ''}
            onClick={() => { setScreen('settings'); setSidebar(false); }}
          >
            <SettingsIcon size={18} />Impostazioni
          </button>
          <button onClick={logout}><LogOut size={18} />Esci</button>
          <button
            className="profile"
            onClick={() => { setScreen('settings'); setSidebar(false); }}
            title="Apri impostazioni account"
          >
            <span>{initialsOf(user.name)}</span>
            <div><b>{user.name}</b><small>Analista · Impostazioni</small></div>
          </button>
        </div>
      </aside>
      <main>
        <header>
          <button className="icon only-mobile" onClick={() => setSidebar(true)} aria-label="Apri menu">
            <Menu size={18} />
          </button>
          <div className="crumb"><span>{meta.label}</span><b>{meta.title}</b></div>
          <div className="header-actions">
            {screen === 'scout' && match.away && <span className="header-live"><i />Live</span>}
            <button className="icon" onClick={() => setDark(!dark)} title={dark ? 'Tema chiaro' : 'Tema scuro'}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="avatar" title="Impostazioni account" onClick={() => setScreen('settings')}>
              {initialsOf(user.name)}
            </button>
          </div>
        </header>
        <div className="screen" key={screen}>
          {screen === 'scout' && (
            <LiveScout
              {...{
                players,
                events,
                setEvents,
                selectedPlayer,
                setSelectedPlayer,
                selectedFundamental,
                setSelectedFundamental,
                selectedGrade,
                setSelectedGrade,
                selectedZone,
                setSelectedZone,
                active,
                selected,
                addEvent,
                match,
                setMatch,
                stat,
              }}
              team={team}
              onGoRoster={() => setScreen('roster')}
            />
          )}
          {screen === 'dashboard' && (
            <Dashboard stat={stat} events={events} match={match} onGoScout={() => setScreen('scout')} />
          )}
          {screen === 'player-stats' && (
            <PlayerStats players={players} events={events} fixtures={fixtures} competitions={competitions} team={team} />
          )}
          {screen === 'roster' && <Roster players={players} setPlayers={setPlayers} team={team} />}
          {screen === 'matches' && (
            <Matches
              setMatch={setMatch}
              goLive={() => setScreen('scout')}
              team={team}
              fixtures={fixtures}
              setFixtures={setFixtures}
              competitions={competitions}
              setCompetitions={setCompetitions}
            />
          )}
          {screen === 'reports' && (
            <Reports stat={stat} events={events} match={match} onGoScout={() => setScreen('scout')} />
          )}
          {screen === 'settings' && (
            <SettingsPage
              dark={dark}
              setDark={setDark}
              user={user}
              onLogout={logout}
              team={team}
              setTeam={setTeam}
              players={players}
              setPlayers={setPlayers}
              events={events}
              setEvents={setEvents}
              fixtures={fixtures}
              setFixtures={setFixtures}
              competitions={competitions}
              setCompetitions={setCompetitions}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function LiveScout(props) {
  const {
    match,
    setMatch,
    players,
    events,
    setEvents,
    selectedPlayer,
    setSelectedPlayer,
    active,
    selectedFundamental,
    setSelectedFundamental,
    selectedGrade,
    setSelectedGrade,
    selectedZone,
    setSelectedZone,
    addEvent,
    selected,
    stat,
    team,
    onGoRoster,
  } = props;
  const hasPlayers = players.length > 0;
  const recentEvents = events.slice(-5).reverse();

  return (
    <div className="content scout-page">
      <section className="matchbar">
        <div className="match-meta">
          <span className="live-tag"><i />LIVE <small>SET {match.set}</small></span>
          <span className="match-note">{match.away ? 'Scouting in corso' : 'Nessuna partita configurata'}</span>
        </div>
        <div className="scoreboard">
          <div className={'score-team home ' + (match.serving === 'home' ? 'serving' : '')}>
            {match.serving === 'home' && <span className="serve-dot" title="Al servizio" />}
            {team.logo && <span className="score-logo"><img src={team.logo} alt="" /></span>}
            <span className="team-name">{match.home || 'La tua squadra'}</span>
            <strong>{match.homeScore}</strong>
          </div>
          <span className="dash">:</span>
          <div className={'score-team away ' + (match.serving === 'away' ? 'serving' : '')}>
            <strong>{match.awayScore}</strong>
            <span className="team-name">{match.away || 'Avversaria'}</span>
            {match.serving === 'away' && <span className="serve-dot" title="Al servizio" />}
          </div>
        </div>
        <div className="set-score">
          <span className="set-chip">Set <b>{match.set}</b></span>
          <button
            className="outline"
            onClick={() => setMatch(current => ({ ...current, set: current.set + 1, homeScore: 0, awayScore: 0 }))}
          >
            Fine set
          </button>
        </div>
      </section>

      <div className="scout-grid">
        <section className="card scouting-card">
          <div className="section-title">
            <div>
              <span className="eyebrow">AZIONE</span>
              <h1>Registra evento</h1>
              <p className="section-sub">Atleta, fondamentale ed esito in tre passaggi.</p>
            </div>
            <span className="step">3 passaggi</span>
          </div>

          {!hasPlayers ? (
            <div className="inline-empty">
              <span className="inline-empty-icon"><Users size={20} /></span>
              <div>
                <b>Roster ancora vuoto</b>
                <span>Aggiungi le giocatrici per iniziare a registrare.</span>
              </div>
              <button className="outline" onClick={onGoRoster}>Apri roster</button>
            </div>
          ) : (
            <>
              <div className="flow-label"><b>1</b> Chi ha eseguito l'azione?</div>
              <div className="player-grid">
                {players.map(player => (
                  <button
                    key={player.number}
                    onClick={() => setSelectedPlayer(player.number)}
                    className={'player-btn ' + (selectedPlayer === player.number ? 'chosen' : '')}
                  >
                    <PlayerFace player={player} className="player-btn-face" />
                    <div>
                      <b>{player.name.split(' ')[0]}</b>
                      <small>{roleLabels[player.role] || player.role}</small>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flow-label"><b>2</b> Fondamentale</div>
              <div className="fund-grid">
                {fundamentals.map(fundamental => {
                  const Icon = fundamental.icon;
                  return (
                    <button
                      className={'fund ' + (selectedFundamental === fundamental.key ? 'chosen' : '')}
                      onClick={() => { setSelectedFundamental(fundamental.key); setSelectedGrade(fundamental.tones[0]); }}
                      key={fundamental.key}
                    >
                      <span className="fund-icon"><Icon size={19} /></span>
                      <span>{fundamental.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flow-label"><b>3</b> Esito <em>{active.label}</em></div>
              <div className="grade-grid">
                {active.tones.map(grade => (
                  <button
                    className={'grade ' + grades[grade][1] + ' ' + (selectedGrade === grade ? 'chosen' : '')}
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    aria-pressed={selectedGrade === grade}
                  >
                    <strong>{grade}</strong>
                    <span>{grades[grade][0]}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="card court-card">
          <div className="court-heading">
            <div>
              <span className="eyebrow">FORMAZIONE IN CAMPO</span>
              <h2>Rotazione <span className="rotation-pill">↻</span></h2>
              <p className="section-sub">Tocca una giocatrice o una zona d'arrivo.</p>
            </div>
            <span className="court-badge">{Math.min(players.length, 6)}/6 in campo</span>
          </div>
          <div className="court-legend">
            <span><i className="legend-player" /> atleta in campo</span>
            <span><i className="legend-target" /> destinazione azione</span>
          </div>
          <div className="court-wrap">
            <div className="court">
              <div className="court-side opponent">{match.away ? match.away.toUpperCase() : 'CAMPO AVVERSARIO'}</div>
              <div className="court-side own">{team.name.toUpperCase()}</div>
              <div className="net"><b>RETE</b></div>
              {targetZones.map(zone => (
                <button
                  key={zone.id}
                  aria-label={'Zona ' + zone.id + ' di arrivo'}
                  className={'target-zone ' + (selectedZone === zone.id ? 'selected' : '')}
                  style={{ left: zone.x + '%', top: zone.y + '%' }}
                  onClick={() => setSelectedZone(zone.id)}
                >
                  {selectedZone === zone.id ? <Check size={14} /> : <Plus size={14} />}
                  <small>Z{zone.id}</small>
                </button>
              ))}
              {formationZones.map((zoneId, index) => {
                const player = players[index];
                const spot = playerSpots.find(item => item.id === zoneId);
                if (!player || !spot) return null;
                return (
                  <button
                    key={player.number}
                    className={'court-player ' + (selectedPlayer === player.number ? 'selected' : '')}
                    style={{ left: spot.x + '%', top: spot.y + '%' }}
                    onClick={() => setSelectedPlayer(player.number)}
                  >
                    <PlayerFace player={player} className="court-face" />
                    <span className="court-player-name">
                      {player.name.split(' ')[0]}
                      <small>{roleLabels[player.role] || player.role}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="court-footer">
            <div className="selection-summary">
              <span className="summary-chip"><Target size={14} /> Zona <b>{selectedZone}</b></span>
              <span className="summary-chip"><Users size={14} /> <b>{selected ? selected.name : 'Seleziona atleta'}</b></span>
            </div>
            <button className="primary save-event" onClick={addEvent} disabled={!selected}>
              <Plus size={18} /> Registra azione
            </button>
          </div>
          <div className="quick-actions">
            <button onClick={() => setMatch(current => ({ ...current, awayScore: current.awayScore + 1, serving: 'away' }))}>
              Punto avversario
            </button>
            <button onClick={() => setEvents(list => list.slice(0, -1))}>Annulla ultima</button>
          </div>
        </section>
      </div>

      <section className="live-bottom">
        <div className="stat-strip">
          <div className="stat-item">
            <span className="stat-icon violet"><Activity size={17} /></span>
            <div><small>AZIONI</small><b>{stat.total}</b></div>
          </div>
          <div className="stat-item">
            <span className="stat-icon mint"><Gauge size={17} /></span>
            <div><small>EFF. ATTACCO</small><b>{stat.efficiency}%</b><span>efficienza</span></div>
          </div>
          <div className="stat-item">
            <span className="stat-icon amber"><Trophy size={17} /></span>
            <div><small>PUNTI DIRETTI</small><b>{stat.points}</b></div>
          </div>
        </div>
        <div className="event-log">
          <div className="event-log-head"><b>Ultime azioni</b><span>{events.length} totali</span></div>
          <div className="event-log-list">
            {recentEvents.length ? recentEvents.map((event, index) => (
              <span className="log-item" key={event.time || index}>
                <i className={grades[event.grade][1]}>{event.grade}</i>
                <b>#{event.player}</b>
                {fundamentals.find(fundamental => fundamental.key === event.fundamental)?.label}
                <small>Z{event.zone}</small>
              </span>
            )) : <span className="log-empty">Nessuna azione registrata ancora.</span>}
          </div>
        </div>
      </section>
    </div>
  );
}

function downloadReport(events, match, stat) {
  const rows = [
    ['VOLLEYSCOUT REPORT'],
    [match.home + ' vs ' + match.away],
    ['Set', match.set],
    [],
    ['Azioni', stat.total],
    ['Punti diretti', stat.points],
    ['Efficienza attacco', stat.efficiency + '%'],
    [],
    ['Giocatrice', 'Fondamentale', 'Esito', 'Zona'],
  ];
  events.forEach(event => rows.push([
    `#${event.player}`,
    fundamentals.find(fundamental => fundamental.key === event.fundamental)?.label,
    event.grade,
    event.zone,
  ]));
  const blob = new Blob([rows.map(row => row.join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'report-volley-scout.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function Dashboard({ stat, events, match, onGoScout }) {
  const gradesCount = ['#', '+', '/', '-', '='].map(grade => ({
    g: grade,
    n: events.filter(event => event.grade === grade).length,
  }));
  const teamName = match.home || 'La tua squadra';

  return (
    <div className="content dashboard">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ANALISI PARTITA</span>
          <h1>Performance overview</h1>
          <p>{teamName}{match.away ? ` vs ${match.away}` : ''} · aggiornato in tempo reale</p>
        </div>
        <button className="outline" onClick={() => downloadReport(events, match, stat)} disabled={!events.length}>
          <Download size={17} /> Esporta CSV
        </button>
      </div>

      <div className="kpis">
        <Kpi icon={Trophy} tone="amber" label="Punti segnati" value={stat.points} detail="azioni vincenti" />
        <Kpi icon={Gauge} tone="mint" label="Efficienza attacco" value={stat.efficiency + '%'} detail="su tutte le azioni" />
        <Kpi icon={Activity} tone="violet" label="Azioni rilevate" value={stat.total} detail="in questa partita" />
      </div>

      {events.length === 0 ? (
        <div className="card empty-panel">
          <span className="empty-panel-icon"><BarChart3 size={22} /></span>
          <div>
            <b>Ancora nessuna azione</b>
            <p>Registra i primi eventi nel live scouting per vedere qui le statistiche della partita.</p>
          </div>
          <button className="primary" onClick={onGoScout}>Vai al live scouting <ArrowRight size={16} /></button>
        </div>
      ) : (
        <div className="dashboard-grid">
          <section className="card panel">
            <div className="panel-head">
              <div><h2>Qualità delle azioni</h2><p>Distribuzione degli esiti registrati</p></div>
              <span className="panel-badge">{events.length} azioni</span>
            </div>
            <div className="bars">
              {gradesCount.map(item => (
                <div className={'bar-row ' + grades[item.g][1]} key={item.g}>
                  <span className="dot">{item.g}</span>
                  <span className="bar-label">{grades[item.g][0]}</span>
                  <div className="bar-track">
                    <i style={{ width: (item.n / events.length) * 100 + '%' }} />
                  </div>
                  <b>{item.n}</b>
                </div>
              ))}
            </div>
          </section>
          <section className="card panel">
            <div className="panel-head">
              <div><h2>Distribuzione per fondamentale</h2><p>Volume di azioni per gesto tecnico</p></div>
              <span className="panel-badge">{fundamentals.length} gesti</span>
            </div>
            <div className="fund-bars">
              {fundamentals.map(fundamental => {
                const Icon = fundamental.icon;
                const count = events.filter(event => event.fundamental === fundamental.key).length;
                return (
                  <div className="fund-stat" key={fundamental.key}>
                    <span className="fund-stat-icon"><Icon size={15} /></span>
                    <span>{fundamental.label}</span>
                    <div><i style={{ width: (count / events.length) * 100 + '%' }} /></div>
                    <b>{count}</b>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, detail, icon: Icon, tone = 'violet' }) {
  return (
    <div className={'card kpi kpi-' + tone}>
      <span className="kpi-icon"><Icon size={19} /></span>
      <span className="kpi-label">{label}</span>
      <b>{value}</b>
      <small>{detail}</small>
    </div>
  );
}

function PlayerStats({ players, events, fixtures, competitions, team }) {
  const [scope, setScope] = useState('general');
  const [scopeId, setScopeId] = useState('');
  const [exportFixtureId, setExportFixtureId] = useState('');
  const [exportPlayerNumber, setExportPlayerNumber] = useState('');
  const [exporting, setExporting] = useState('');
  const [exportMessage, setExportMessage] = useState(null);
  const scopedFixtures = scope === 'competition'
    ? fixtures.filter(fixture => fixture.competitionId === scopeId)
    : scope === 'match'
      ? fixtures.filter(fixture => fixture.id === scopeId)
      : fixtures;
  const fixtureIds = new Set(scopedFixtures.map(fixture => fixture.id));
  const scopedEvents = scope === 'general' ? events : events.filter(event => fixtureIds.has(event.fixtureId));
  const playerData = players.map(player => {
    const list = scopedEvents.filter(event => event.player === player.number);
    const attacks = list.filter(event => event.fundamental === 'Attack');
    const points = list.filter(event => event.grade === '#').length;
    const errors = list.filter(event => event.grade === '=').length;
    const attackEfficiency = attacks.length
      ? Math.round(((attacks.filter(event => event.grade === '#').length - attacks.filter(event => event.grade === '=').length) / attacks.length) * 100)
      : 0;
    return { ...player, actions: list.length, points, errors, attackEfficiency };
  }).sort((a, b) => b.points - a.points || b.actions - a.actions);
  const resetScope = value => { setScope(value); setScopeId(''); };
  const efficiencyClass = value => value >= 40 ? 'excellent' : value < 0 ? 'error' : '';

  const exportMatchReport = async () => {
    const fixture = fixtures.find(item => item.id === exportFixtureId);
    if (!fixture) return;
    setExporting('match');
    setExportMessage(null);
    try {
      const { exportMatchPdf } = await import('./dataFiles');
      await exportMatchPdf({ team, players, events, fixtures, competitions, fixture, roleLabels, grades, fundamentals });
      setExportMessage({ type: 'success', text: `PDF della gara generato: ${fixture.home} vs ${fixture.away}.` });
    } catch (error) {
      setExportMessage({ type: 'error', text: error?.message || 'Impossibile generare il PDF della gara.' });
    } finally {
      setExporting('');
    }
  };

  const exportPlayerReport = async () => {
    const player = players.find(item => String(item.number) === exportPlayerNumber);
    if (!player) return;
    setExporting('player');
    setExportMessage(null);
    try {
      const { exportPlayerPdf } = await import('./dataFiles');
      await exportPlayerPdf({ team, player, players, events, fixtures, competitions, roleLabels, grades, fundamentals });
      setExportMessage({ type: 'success', text: `PDF atleta generato: #${player.number} ${player.name}.` });
    } catch (error) {
      setExportMessage({ type: 'error', text: error?.message || 'Impossibile generare il PDF atleta.' });
    } finally {
      setExporting('');
    }
  };

  return (
    <div className="content player-stats">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ANALISI INDIVIDUALE</span>
          <h1>Statistiche giocatrici</h1>
          <p>Confronta le prestazioni complessive, per campionato o per singola partita.</p>
        </div>
      </div>

      <section className="card stats-filters">
        <label>
          Visualizza dati
          <select value={scope} onChange={event => resetScope(event.target.value)}>
            <option value="general">Generali — tutte le partite</option>
            <option value="competition">Per campionato</option>
            <option value="match">Per partita singola</option>
          </select>
        </label>
        {scope === 'competition' && (
          <label>
            Campionato
            <select value={scopeId} onChange={event => setScopeId(event.target.value)}>
              <option value="">Seleziona campionato</option>
              {competitions.map(competition => <option value={competition.id} key={competition.id}>{competition.name}</option>)}
            </select>
          </label>
        )}
        {scope === 'match' && (
          <label>
            Partita
            <select value={scopeId} onChange={event => setScopeId(event.target.value)}>
              <option value="">Seleziona partita</option>
              {fixtures.map(fixture => (
                <option value={fixture.id} key={fixture.id}>
                  {new Date(fixture.date).toLocaleDateString('it-IT')} · {fixture.home} vs {fixture.away}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <div className="kpis">
        <Kpi icon={Activity} tone="violet" label="Azioni nel filtro" value={scopedEvents.length} detail={scope === 'general' ? 'tutte le gare' : 'gara/e selezionata/e'} />
        <Kpi icon={Trophy} tone="amber" label="Punti diretti" value={scopedEvents.filter(event => event.grade === '#').length} detail="di tutte le giocatrici" />
        <Kpi icon={Users} tone="mint" label="Giocatrici rilevate" value={playerData.filter(player => player.actions > 0).length} detail="con almeno un'azione" />
      </div>

      <section className="card export-panel">
        <div className="export-panel-head">
          <span className="setting-icon"><FileText size={18} /></span>
          <div>
            <b>Esporta report PDF</b>
            <small>Un report completo per una singola gara oppure per una giocatrice.</small>
          </div>
        </div>
        <div className="export-controls">
          <label>
            Report gara
            <div className="export-control-row">
              <select value={exportFixtureId} onChange={event => setExportFixtureId(event.target.value)}>
                <option value="">Seleziona una gara</option>
                {fixtures.map(fixture => (
                  <option value={fixture.id} key={fixture.id}>
                    {new Date(fixture.date).toLocaleDateString('it-IT')} · {fixture.home} vs {fixture.away}
                  </option>
                ))}
              </select>
              <button
                className="outline"
                onClick={exportMatchReport}
                disabled={!fixtures.length || !exportFixtureId || !!exporting}
              >
                <FileText size={15} /> {exporting === 'match' ? 'Generazione...' : 'PDF gara'}
              </button>
            </div>
          </label>
          <label>
            Report atleta
            <div className="export-control-row">
              <select value={exportPlayerNumber} onChange={event => setExportPlayerNumber(event.target.value)}>
                <option value="">Seleziona una giocatrice</option>
                {players.map(player => (
                  <option value={String(player.number)} key={player.number}>
                    {player.number} · {player.name}
                  </option>
                ))}
              </select>
              <button
                className="outline"
                onClick={exportPlayerReport}
                disabled={!players.length || !exportPlayerNumber || !!exporting}
              >
                <FileText size={15} /> {exporting === 'player' ? 'Generazione...' : 'PDF atleta'}
              </button>
            </div>
          </label>
        </div>
        {exportMessage && (
          <p className={`data-feedback ${exportMessage.type}`} role="status">{exportMessage.text}</p>
        )}
      </section>

      <section className="card player-stats-table">
        <div className="stats-row stats-head">
          <span>Giocatrice</span><span>Azioni</span><span>Punti</span><span>Errori</span><span>Eff. attacco</span>
        </div>
        {playerData.length === 0 ? (
          <div className="table-empty">
            <Users size={24} />
            <b>Nessuna giocatrice</b>
            <span>Aggiungi atlete al roster per visualizzarne le statistiche.</span>
          </div>
        ) : playerData.map(player => (
          <div className="stats-row" key={player.number}>
            <span className="stats-player">
              <PlayerFace player={player} className="stats-face" />
              <b>{player.name}</b>
              <small>{roleLabels[player.role] || player.role}</small>
            </span>
            <strong>{player.actions}</strong>
            <strong className="excellent">{player.points}</strong>
            <strong className="error">{player.errors}</strong>
            <strong className={efficiencyClass(player.attackEfficiency)}>{player.attackEfficiency}%</strong>
          </div>
        ))}
      </section>
    </div>
  );
}

function Roster({ players, setPlayers, team }) {
  const emptyForm = { number: '', name: '', role: 'P', birthDate: '', photo: '' };
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(null);

  const add = () => {
    if (!form.name || !form.number || !form.birthDate) return setError('Inserisci numero, nome e data di nascita.');
    if (players.some(player => player.number === +form.number)) return setError('Questo numero è già presente.');
    setPlayers([...players, {
      ...form,
      number: +form.number,
      color: playerColors[players.length % playerColors.length],
    }]);
    setForm(emptyForm);
    setError('');
  };

  const updateFormPhoto = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoLoading(true);
    setError('');
    try {
      const photo = await imageFileToDataURL(file, { size: 320, fit: 'cover' });
      setForm(current => ({ ...current, photo }));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setPhotoLoading(false);
    }
  };

  const updatePlayerPhoto = async (player, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUpdatingPhoto(player.number);
    setError('');
    try {
      const photo = await imageFileToDataURL(file, { size: 320, fit: 'cover' });
      setPlayers(list => list.map(item => item.number === player.number ? { ...item, photo } : item));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUpdatingPhoto(null);
    }
  };

  const removePlayerPhoto = number => {
    setPlayers(list => list.map(player => player.number === number ? { ...player, photo: '' } : player));
  };

  return (
    <div className="content roster">
      <div className="page-heading">
        <div className="page-heading-title">
          <TeamLogo team={team} className="page-team-logo" />
          <div>
            <span className="eyebrow">GESTIONE SQUADRA</span>
            <h1>Roster {team.name}</h1>
            <p>{players.length} atlete disponibili per lo scouting.</p>
          </div>
        </div>
        <span className="count-pill"><Users size={15} />{players.length} atlete</span>
      </div>

      <section className="card roster-editor">
        <div className="editor-head">
          <div><span className="eyebrow">NUOVA ATLETA</span><b>Aggiungi al roster</b></div>
          <small>Numero, nome, data di nascita e ruolo.</small>
        </div>
        <div className="player-photo-add">
          <label
            className={'photo-picker' + (form.photo ? ' has-photo' : '')}
            title={form.photo ? 'Cambia foto' : 'Carica la foto della giocatrice'}
          >
            <input type="file" accept="image/*" onChange={updateFormPhoto} disabled={photoLoading} aria-label="Carica la foto della giocatrice" />
            {form.photo ? <img src={form.photo} alt="Anteprima foto giocatrice" /> : <Camera size={19} />}
            {photoLoading && <span className="photo-loading" />}
          </label>
          <div>
            <b>{form.photo ? 'Foto pronta' : 'Foto atleta'}</b>
            <small>Facoltativa · JPG, PNG o WEBP</small>
          </div>
          {form.photo && (
            <button type="button" className="outline danger" onClick={() => setForm(current => ({ ...current, photo: '' }))}>
              <X size={14} /> Rimuovi
            </button>
          )}
        </div>
        <div className="roster-add roster-add-full">
          <input
            aria-label="Numero maglia"
            placeholder="N°"
            value={form.number}
            onChange={event => setForm({ ...form, number: event.target.value.replace(/\D/g, '') })}
          />
          <input
            placeholder="Nome e cognome"
            value={form.name}
            onChange={event => setForm({ ...form, name: event.target.value })}
          />
          <input
            aria-label="Data di nascita"
            type="date"
            value={form.birthDate}
            onChange={event => setForm({ ...form, birthDate: event.target.value })}
          />
          <select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}>
            <option value="P">P — Palleggiatrice</option>
            <option value="O">O — Opposto</option>
            <option value="S">S — Schiacciatrice</option>
            <option value="C">C — Centrale</option>
            <option value="L">L — Libero</option>
          </select>
          <button className="primary" onClick={add}><Plus size={18} /> Aggiungi</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>

      <div className="card roster-table roster-table-full">
        <div className="table-head"><span>N°</span><span>Giocatrice</span><span>Ruolo</span><span>Nascita</span><span /></div>
        {players.length === 0 ? (
          <div className="table-empty">
            <Users size={24} />
            <b>Nessuna giocatrice</b>
            <span>Aggiungi la prima atleta dal modulo qui sopra.</span>
          </div>
        ) : players.map(player => (
          <div key={player.number}>
            <div className="photo-cell">
              <label
                className={'roster-face' + (player.photo ? ' has-photo' : '') + (updatingPhoto === player.number ? ' loading' : '')}
                style={{ background: player.color }}
                title={player.photo ? 'Cambia foto di ' + player.name : 'Aggiungi foto di ' + player.name}
              >
                <input type="file" accept="image/*" onChange={event => updatePlayerPhoto(player, event)} aria-label={'Carica la foto di ' + player.name} />
                {player.photo ? <img src={player.photo} alt={`Foto di ${player.name}`} /> : player.number}
                {player.photo && <small>{player.number}</small>}
                <span className="photo-hint"><Camera size={11} /></span>
                {updatingPhoto === player.number && <span className="photo-loading" />}
              </label>
              {player.photo && (
                <button
                  className="remove-photo"
                  title={'Rimuovi la foto di ' + player.name}
                  onClick={() => removePlayerPhoto(player.number)}
                >
                  <X size={10} />
                </button>
              )}
            </div>
            <div className="player-cell">
              <b>{player.name}</b>
              <small>{roleLabels[player.role] || player.role}</small>
            </div>
            <span className="role">{player.role}</span>
            <time>{player.birthDate ? new Date(player.birthDate + 'T00:00:00').toLocaleDateString('it-IT') : '—'}</time>
            <button
              className="delete-player"
              title={'Rimuovi ' + player.name}
              onClick={() => setPlayers(players.filter(item => item.number !== player.number))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Matches({ setMatch, goLive, team, fixtures, setFixtures, competitions, setCompetitions }) {
  const [draft, setDraft] = useState({ away: '', date: '', competitionId: '' });
  const [competitionName, setCompetitionName] = useState('');
  const [error, setError] = useState('');

  const addCompetition = () => {
    if (!competitionName.trim()) return;
    const id = crypto.randomUUID();
    setCompetitions([...competitions, { id, name: competitionName.trim() }]);
    setDraft({ ...draft, competitionId: id });
    setCompetitionName('');
  };

  const add = () => {
    if (!draft.away.trim() || !draft.date || !draft.competitionId) return setError('Scegli campionato, avversaria e data.');
    setFixtures([...fixtures, {
      id: crypto.randomUUID(),
      home: team.name,
      away: draft.away.trim(),
      date: draft.date,
      competitionId: draft.competitionId,
      status: 'programmata',
    }].sort((a, b) => a.date.localeCompare(b.date)));
    setDraft({ away: '', date: '', competitionId: draft.competitionId });
    setError('');
  };

  const start = fixture => {
    setMatch({
      home: fixture.home,
      away: fixture.away,
      set: 1,
      homeScore: 0,
      awayScore: 0,
      serving: 'home',
      fixtureId: fixture.id,
    });
    setFixtures(fixtures.map(item => item.id === fixture.id ? { ...item, status: 'in corso' } : item));
    goLive();
  };

  return (
    <div className="content matches">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CALENDARIO</span>
          <h1>Campionati e partite</h1>
          <p>Crea il campionato e aggiungi le relative gare da scautare.</p>
        </div>
      </div>

      <section className="card competition-create">
        <div className="competition-copy">
          <span className="icon-tile"><Trophy size={19} /></span>
          <div><span className="eyebrow">NUOVO CAMPIONATO</span><b>Organizza il calendario</b></div>
        </div>
        <input
          value={competitionName}
          onChange={event => setCompetitionName(event.target.value)}
          placeholder="Es. Serie C Femminile 2026/27"
        />
        <button className="primary" onClick={addCompetition}><Plus size={18} /> Crea campionato</button>
      </section>

      <section className="card setup-card fixture-form">
        <label>
          Campionato
          <select value={draft.competitionId} onChange={event => setDraft({ ...draft, competitionId: event.target.value })}>
            <option value="">Seleziona campionato</option>
            {competitions.map(competition => <option key={competition.id} value={competition.id}>{competition.name}</option>)}
          </select>
        </label>
        <label>
          Avversaria
          <input
            value={draft.away}
            onChange={event => setDraft({ ...draft, away: event.target.value })}
            placeholder="Nome squadra avversaria"
          />
        </label>
        <label>
          Data e ora
          <input type="datetime-local" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} />
        </label>
        <button className="primary" onClick={add}><Plus size={18} /> Aggiungi partita</button>
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="fixtures-list">
        {competitions.length === 0 ? (
          <div className="card empty-fixture">
            <CalendarDays size={24} />
            <b>Nessun campionato creato</b>
            <span>Crea il primo campionato per programmare le partite.</span>
          </div>
        ) : competitions.map(competition => {
          const games = fixtures.filter(fixture => fixture.competitionId === competition.id);
          return (
            <div className="competition-group" key={competition.id}>
              <div className="competition-title">
                <div>
                  <span className="eyebrow">CAMPIONATO</span>
                  <h2>{competition.name}</h2>
                  <small>{games.length} {games.length === 1 ? 'partita' : 'partite'}</small>
                </div>
                <button
                  className="delete-player"
                  title="Elimina campionato e partite"
                  onClick={() => {
                    setCompetitions(competitions.filter(item => item.id !== competition.id));
                    setFixtures(fixtures.filter(item => item.competitionId !== competition.id));
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {games.length === 0 ? <div className="no-games">Nessuna partita ancora programmata.</div> : games.map(fixture => (
                <article className="card fixture" key={fixture.id}>
                  <div className="fixture-date">
                    <b>{new Date(fixture.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</b>
                    <small>{new Date(fixture.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</small>
                  </div>
                  <div className="fixture-main">
                    <span className={'fixture-status ' + (fixture.status === 'in corso' ? 'live' : 'scheduled')}>{fixture.status}</span>
                    <b>{fixture.home}<em>vs</em>{fixture.away}</b>
                  </div>
                  <button className="outline" onClick={() => start(fixture)}>
                    <Activity size={16} /> {fixture.status === 'in corso' ? 'Riprendi scout' : 'Avvia scout'}
                  </button>
                  <button className="delete-player" title="Elimina partita" onClick={() => setFixtures(fixtures.filter(item => item.id !== fixture.id))}>
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function Reports({ stat, events, match, onGoScout }) {
  const reportEvents = events.slice(-8).reverse();
  const teamName = match.home || 'La tua squadra';

  return (
    <div className="content reports">
      <div className="page-heading">
        <div>
          <span className="eyebrow">REPORT</span>
          <h1>Report partita</h1>
          <p>{teamName}{match.away ? ` vs ${match.away}` : ' · nessuna partita configurata'}</p>
        </div>
        <button className="primary" onClick={() => downloadReport(events, match, stat)} disabled={!events.length}>
          <Download size={17} /> Scarica CSV
        </button>
      </div>

      <div className="kpis">
        <Kpi icon={Activity} tone="violet" label="Azioni registrate" value={stat.total} detail="nella partita corrente" />
        <Kpi icon={Trophy} tone="amber" label="Punti diretti" value={stat.points} detail="azioni vincenti" />
        <Kpi icon={Gauge} tone="mint" label="Efficienza attacco" value={stat.efficiency + '%'} detail="sugli attacchi" />
      </div>

      <section className="card report-card">
        <div className="panel-head">
          <div><h2>Ultime azioni registrate</h2><p>Anteprima dei dati inclusi nel report</p></div>
          <span className="panel-badge">{events.length} totali</span>
        </div>
        {reportEvents.length ? (
          <div className="report-list">
            {reportEvents.map((event, index) => (
              <div className="report-row" key={event.time || index}>
                <i className={grades[event.grade][1]}>{event.grade}</i>
                <b>#{event.player} · {fundamentals.find(fundamental => fundamental.key === event.fundamental)?.label}</b>
                <span>{grades[event.grade][0]}</span>
                <small>Zona {event.zone}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-inline">
            <p>Nessuna azione disponibile.</p>
            <button className="outline" onClick={onGoScout}>Vai al live scouting</button>
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsPage({
  dark,
  setDark,
  user,
  onLogout,
  team,
  setTeam,
  players,
  setPlayers,
  events,
  setEvents,
  fixtures,
  setFixtures,
  competitions,
  setCompetitions,
}) {
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [dataStatus, setDataStatus] = useState(null);

  const updateLogo = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLogoLoading(true);
    setLogoError('');
    try {
      const logo = await imageFileToDataURL(file, { size: 320, fit: 'contain' });
      setTeam(current => ({ ...current, logo }));
    } catch (uploadError) {
      setLogoError(uploadError.message);
    } finally {
      setLogoLoading(false);
    }
  };

  const removeLogo = () => {
    setTeam(current => ({ ...current, logo: '' }));
    setLogoError('');
  };

  const exportPdf = async () => {
    setPdfLoading(true);
    setDataStatus(null);
    try {
      const { exportDataPdf } = await import('./dataFiles');
      await exportDataPdf({ team, players, events, fixtures, competitions, roleLabels, grades, fundamentals });
      setDataStatus({ type: 'success', text: 'PDF generato e scaricato correttamente.' });
    } catch (error) {
      setDataStatus({ type: 'error', text: error?.message || 'Impossibile generare il PDF.' });
    } finally {
      setPdfLoading(false);
    }
  };

  const saveBackup = async () => {
    setDataStatus(null);
    try {
      const { downloadBackup } = await import('./dataFiles');
      const filename = downloadBackup({
        team,
        players,
        events,
        fixtures,
        competitions,
        theme: dark ? 'dark' : 'light',
      });
      setDataStatus({ type: 'success', text: `Backup salvato: ${filename}` });
    } catch (error) {
      setDataStatus({ type: 'error', text: error?.message || 'Impossibile creare il backup.' });
    }
  };

  const restoreBackup = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImportLoading(true);
    setDataStatus(null);
    try {
      const { parseBackupFile } = await import('./dataFiles');
      const data = await parseBackupFile(file);
      if (!window.confirm('Ripristinare il backup selezionato? Tutti i dati attuali di squadra, roster, partite e statistiche verranno sostituiti.')) {
        setDataStatus({ type: 'info', text: 'Ripristino annullato.' });
        return;
      }
      setTeam(data.team);
      setPlayers(data.players);
      setEvents(data.events);
      setFixtures(data.fixtures);
      setCompetitions(data.competitions);
      setDark(data.theme === 'dark');
      setDataStatus({
        type: 'success',
        text: `Backup ripristinato: ${data.players.length} atlete, ${data.fixtures.length} partite e ${data.events.length} azioni.`,
      });
    } catch (error) {
      setDataStatus({ type: 'error', text: error?.message || 'Impossibile ripristinare il backup.' });
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="content settings-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PREFERENZE</span>
          <h1>Impostazioni</h1>
          <p>Personalizza l'esperienza di scouting.</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="card settings-card identity-card">
          <div className="setting-main">
            <TeamLogo team={team} className={'settings-logo' + (team.logo ? ' has-logo' : '')} />
            <div>
              <b>Logo società</b>
              <small>{team.logo ? `${team.name} · logo caricato` : 'Carica il logo del tuo club per renderlo riconoscibile.'}</small>
            </div>
          </div>
          <div className="setting-actions">
            <label className={'outline upload-label' + (logoLoading ? ' loading' : '')}>
              <ImagePlus size={16} />
              {logoLoading ? 'Caricamento...' : team.logo ? 'Cambia logo' : 'Carica logo'}
              <input type="file" accept="image/*" onChange={updateLogo} disabled={logoLoading} aria-label="Carica il logo della società" />
            </label>
            {team.logo && (
              <button className="delete-player" title="Rimuovi logo" onClick={removeLogo}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </section>
        {logoError && <p className="form-error" role="alert">{logoError}</p>}

        <section className="card settings-card">
          <div className="setting-main">
            <span className="setting-icon"><Moon size={18} /></span>
            <div><b>Modalità scura</b><small>Riduce la luminosità per le sessioni serali.</small></div>
          </div>
          <button
            className={'switch ' + (dark ? 'on' : '')}
            role="switch"
            aria-checked={dark}
            aria-label="Attiva modalità scura"
            onClick={() => setDark(!dark)}
          >
            <span />
          </button>
        </section>

        <section className="card data-card">
          <div className="data-card-head">
            <span className="setting-icon"><DatabaseBackup size={18} /></span>
            <div>
              <b>Dati e backup</b>
              <small>Esporta un PDF leggibile oppure salva un backup JSON da ricaricare per ripristinare tutto.</small>
            </div>
          </div>
          <div className="data-actions">
            <button className="primary" onClick={exportPdf} disabled={pdfLoading}>
              <FileText size={16} />
              {pdfLoading ? 'Generazione PDF...' : 'Salva PDF'}
            </button>
            <button className="outline" onClick={saveBackup}>
              <DatabaseBackup size={16} /> Backup JSON
            </button>
            <label className={'outline upload-label' + (importLoading ? ' loading' : '')}>
              <Upload size={16} />
              {importLoading ? 'Ripristino...' : 'Ripristina backup'}
              <input
                type="file"
                accept="application/json,.json"
                onChange={restoreBackup}
                disabled={importLoading}
                aria-label="Seleziona un backup JSON da ripristinare"
              />
            </label>
          </div>
          <p className="data-summary">
            {players.length} atlete · {fixtures.length} partite · {events.length} azioni · {competitions.length} campionati
          </p>
          {dataStatus && (
            <p className={`data-feedback ${dataStatus.type}`} role="status">{dataStatus.text}</p>
          )}
        </section>

        <section className="card settings-card">
          <div className="setting-main">
            <span className="setting-icon"><ShieldCheck size={18} /></span>
            <div><b>Dati locali</b><small>Roster, partite e statistiche restano su questo dispositivo.</small></div>
          </div>
          <span className="setting-tag">Solo offline</span>
        </section>

        <section className="card settings-card">
          <div className="setting-main">
            <span className="avatar big">{initialsOf(user.name)}</span>
            <div><b>{user.name}</b><small>{user.email}</small></div>
          </div>
          <button className="outline danger" onClick={onLogout}><LogOut size={16} /> Esci</button>
        </section>
      </div>
      <p className="app-version">VolleyScout · Live Analysis</p>
    </div>
  );
}

function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-visual">
          <div className="auth-visual-top">
            <div className="auth-brand">
              <span className="brand-mark"><img src="/logo.png" alt="" /></span>
              <span className="brand-word">Volley<span>Scout</span></span>
            </div>
            <span className="auth-pill"><Sparkles size={14} /> Live analysis</span>
          </div>
          <div className="auth-visual-copy">
            <span className="eyebrow">DAL CAMPO AI NUMERI</span>
            <h2>Lo scouting che segue il ritmo della partita.</h2>
            <p>Registra ogni azione in un tap, analizza le prestazioni e porta al tuo staff report pronti in pochi secondi.</p>
          </div>
          <ul className="auth-features">
            <li><span><Target size={17} /></span><div><b>Scouting in tempo reale</b><small>Atleta, fondamentale, esito e zona.</small></div></li>
            <li><span><BarChart3 size={17} /></span><div><b>Statistiche chiare</b><small>Efficienza, punti e distribuzione.</small></div></li>
            <li><span><ShieldCheck size={17} /></span><div><b>Dati al sicuro</b><small>Tutto salvato sul tuo dispositivo.</small></div></li>
          </ul>
          <div className="auth-stat-row">
            <div><b>1 tap</b><span>per azione</span></div>
            <div><b>6</b><span>fondamentali</span></div>
            <div><b>100%</b><span>offline</span></div>
          </div>
        </aside>
        <section className="auth-card">{children}</section>
      </div>
    </div>
  );
}

function TeamSetup({ onCreate }) {
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [logoLoading, setLogoLoading] = useState(false);
  const [error, setError] = useState('');

  const updateLogo = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLogoLoading(true);
    setError('');
    try {
      setLogo(await imageFileToDataURL(file, { size: 320, fit: 'contain' }));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setLogoLoading(false);
    }
  };

  const submit = event => {
    event.preventDefault();
    if (!name.trim()) return setError('Inserisci il nome della squadra.');
    onCreate({ name: name.trim(), logo });
  };

  return (
    <AuthLayout>
      <div className="auth-brand mobile-brand">
        <span className="brand-mark"><img src="/logo.png" alt="" /></span>
        <span className="brand-word">Volley<span>Scout</span></span>
      </div>
      <div className="auth-card-head">
        <span className="eyebrow">PRIMO PASSO</span>
        <h1>Crea la tua squadra</h1>
        <p>Non esistono squadre o giocatrici preimpostate: inizia dal tuo gruppo di lavoro.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label>
          Nome squadra
          <input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Es. ASD Volley Roma" />
        </label>
        <div className="team-logo-field">
          <label className={'logo-picker' + (logo ? ' has-logo' : '')} title="Carica il logo della società">
            <input type="file" accept="image/*" onChange={updateLogo} disabled={logoLoading} aria-label="Carica il logo della società" />
            {logo ? <img src={logo} alt="Anteprima logo società" /> : <Building2 size={20} />}
            {logoLoading && <span className="photo-loading" />}
          </label>
          <div>
            <b>Logo società</b>
            <small>{logo ? 'Pronto · puoi cambiarlo anche nelle impostazioni.' : 'Facoltativo · JPG, PNG o WEBP'}</small>
          </div>
          {logo && <button type="button" className="delete-player" title="Rimuovi logo" onClick={() => setLogo('')}><X size={15} /></button>}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary auth-submit" type="submit">Crea squadra <ArrowRight size={17} /></button>
      </form>
      <p className="auth-note"><ShieldCheck size={14} /> Potrai aggiungere le atlete subito dopo.</p>
    </AuthLayout>
  );
}

function Auth({ onSuccess }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const submit = event => {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!email || !form.password) return setError('Inserisci email e password.');
    if (form.password.length < 4) return setError('La password deve avere almeno 4 caratteri.');
    let account = JSON.parse(localStorage.getItem('volley-account') || 'null');
    if (mode === 'register') {
      if (!form.name.trim()) return setError('Inserisci il tuo nome.');
      account = { name: form.name.trim(), email, password: form.password };
      localStorage.setItem('volley-account', JSON.stringify(account));
    } else if (!account || account.email !== email || account.password !== form.password) {
      return setError('Credenziali non riconosciute. Registrati se è il primo accesso.');
    }
    onSuccess({ name: account.name, email: account.email });
  };

  return (
    <AuthLayout>
      <div className="auth-brand mobile-brand">
        <span className="brand-mark"><img src="/logo.png" alt="" /></span>
        <span className="brand-word">Volley<span>Scout</span></span>
      </div>
      <div className="auth-card-head">
        <span className="eyebrow">{mode === 'login' ? 'ACCESSO' : 'NUOVO ACCOUNT'}</span>
        <h1>{mode === 'login' ? 'Bentornato' : 'Crea il tuo account'}</h1>
        <p>{mode === 'login' ? 'Accedi per continuare lo scouting.' : 'I dati restano salvati su questo dispositivo.'}</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'register' && (
          <label>
            Nome
            <input
              autoComplete="name"
              value={form.name}
              onChange={event => setForm({ ...form, name: event.target.value })}
              placeholder="Il tuo nome"
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={event => setForm({ ...form, email: event.target.value })}
            placeholder="nome@club.it"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={form.password}
            onChange={event => setForm({ ...form, password: event.target.value })}
            placeholder="Almeno 4 caratteri"
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary auth-submit" type="submit">
          {mode === 'login' ? 'Accedi' : 'Registrati'} <ArrowRight size={17} />
        </button>
      </form>
      <div className="auth-divider"><span>{mode === 'login' ? 'Primo accesso?' : 'Hai già un account?'}</span></div>
      <button
        className="auth-switch"
        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
      >
        {mode === 'login' ? 'Crea un nuovo account' : 'Torna al login'}
      </button>
      <p className="auth-note"><ShieldCheck size={14} /> I dati restano salvati su questo dispositivo.</p>
    </AuthLayout>
  );
}

createRoot(document.getElementById('root')).render(<App />);
