# VolleyScout

Web app per lo **scouting live e l’analisi delle partite di pallavolo**. Permette di gestire società, roster, campionati e partite, registrare ogni azione in tempo reale e consultare statistiche individuali e di squadra. Tutti i dati restano sul dispositivo, senza backend.

## Funzionalità

- **Live scouting**: registra atleta, fondamentale, esito e zona con pochi tap; il punteggio e le statistiche si aggiornano subito.
- **Dashboard partita**: azioni totali, punti diretti, efficienza attacco, distribuzione degli esiti e dei fondamentali.
- **Statistiche giocatrici**: confronto generale, per campionato o per singola partita.
- **Squadra e roster**: numero, nome, ruolo, data di nascita e foto per ogni atleta; logo della società.
- **Campionati e partite**: creazione di campionati, calendario delle gare, avvio/ripresa dello scouting.
- **Report**: PDF completi di società, gara o singola atleta; esportazione CSV delle azioni registrate.
- **Backup e ripristino**: esportazione JSON di tutti i dati e reimportazione con validazione e conferma.
- **Tema chiaro/scuro** e interfaccia responsive per desktop, tablet e smartphone.
- **PWA installabile** con service worker e icone dedicate.

## Stack tecnico

| Ambito | Tecnologia |
| --- | --- |
| UI | React 19 |
| Build | Vite 8 |
| Icone | lucide-react |
| PDF | jsPDF + jspdf-autotable |
| Dati | `localStorage` del browser |
| PWA | Web App Manifest + service worker |

## Requisiti

- **Node.js** 20.19+ oppure 22.12+ (consigliata una versione LTS recente)
- **npm** 10+
- Un browser moderno (Chrome, Edge, Firefox o Safari)

## Avvio locale

```bash
npm install
npm run dev
```

Vite mostra l’indirizzo locale, normalmente `http://localhost:5173`.

## Build di produzione

```bash
npm run build
npm run preview
```

- `npm run build` genera la cartella `dist/`.
- `npm run preview` serve la build locale, normalmente su `http://localhost:4173`.

La cartella `dist/` può essere pubblicata su qualsiasi hosting statico. L’app usa percorsi assoluti (`/logo.png`, `/sw.js`), quindi è consigliata la pubblicazione alla radice del dominio. Se viene pubblicata in una sottocartella, va configurato `base` in Vite e adeguato lo scope del service worker.

## Primo utilizzo

1. **Crea un account**: nome, email e password (minimo 4 caratteri). L’account viene salvato solo in `localStorage`.
2. **Crea la squadra**: inserisci il nome della società e, se vuoi, carica il logo.
3. **Aggiungi le atlete** dal roster, con numero, nome, ruolo, data di nascita e foto facoltativa.
4. **Crea un campionato** dalla sezione Partite e programma le gare.
5. **Avvia lo scouting** da una partita o dalla schermata Live scouting.
6. **Consulta statistiche e report** dalle sezioni Dashboard, Statistiche giocatrici e Report.

> L’accesso viene richiesto a ogni apertura dell’app, anche se l’account è memorizzato. È una scelta pensata per l’uso condiviso su tablet.

## Ruoli e codici

**Ruoli**

| Codice | Ruolo |
| --- | --- |
| `P` | Palleggiatrice |
| `O` | Opposto |
| `S` | Schiacciatrice |
| `C` | Centrale |
| `L` | Libero |

**Fondamentali**: Battuta, Ricezione, Alzata, Attacco, Muro, Difesa.

**Esiti**

| Codice | Significato |
| --- | --- |
| `#` | Punto / perfetta |
| `+` | Positiva |
| `/` | Neutra |
| `-` | Negativa |
| `=` | Errore |

**Efficienza attacco**: `(punti attacco − errori attacco) / azioni di attacco × 100`, arrotondata all’intero. Se non ci sono attacchi, il valore è `0%`.

## Dati salvati

Tutti i dati sono nel `localStorage` del browser, sul dispositivo in uso.

| Chiave | Contenuto |
| --- | --- |
| `volley-account` | Account locale: nome, email, password |
| `volley-team-v2` | Società: nome e logo |
| `volley-players-v2` | Roster: atlete, foto e dati anagrafici |
| `volley-events-v2` | Azioni registrate |
| `volley-fixtures-v2` | Partite del calendario |
| `volley-competitions-v2` | Campionati |
| `volley-theme` | Tema scelto (`light` o `dark`) |

Le immagini caricate (logo e foto) vengono ridimensionate a 320 px e salvate come Data URL WebP, così da occupare meno spazio.

### Backup JSON

Il backup scaricato da **Impostazioni → Dati e backup** ha questo formato:

```json
{
  "format": "volleyscout-backup",
  "version": 1,
  "app": "VolleyScout",
  "exportedAt": "2026-11-04T17:00:00.000Z",
  "data": {
    "team": {},
    "players": [],
    "events": [],
    "fixtures": [],
    "competitions": [],
    "theme": "dark"
  }
}
```

- Include società, logo, roster con foto, partite, campionati, azioni e tema.
- **Non include** l’account o la password.
- Il ripristino valida il file, chiede conferma e sostituisce tutti i dati attuali.
- Un file non riconosciuto viene rifiutato senza modificare nulla.

## Report ed esportazioni

| Posizione | Formato | Contenuto |
| --- | --- | --- |
| Impostazioni → Dati e backup | PDF | Società, riepilogo, roster, partite e registro completo azioni |
| Statistiche giocatrici → Esporta report PDF | PDF | Statistiche di una singola gara |
| Statistiche giocatrici → Esporta report PDF | PDF | Statistiche di una singola atleta, con dettaglio per gara |
| Dashboard | CSV | Azioni registrate nell’app |
| Report | CSV | Azioni registrate nell’app |

I PDF includono logo, intestazioni, tabelle e numerazione delle pagine. `jsPDF` viene caricato solo al momento dell’esportazione, per non appesantire l’avvio.

## Struttura del progetto

```text
Scout-App/
├─ assets/
│  └─ icon-source.jpeg      # Immagine originale dell’icona
├─ public/
│  ├─ logo.png              # Logo usato nell’interfaccia
│  ├─ icon-192.png          # Icona PWA
│  ├─ icon-512.png          # Icona PWA
│  ├─ favicon-32.png        # Favicon
│  ├─ apple-touch-icon.png  # Icona iOS
│  ├─ manifest.webmanifest  # Manifest PWA
│  └─ sw.js                 # Service worker
├─ src/
│  ├─ main.jsx              # Componenti e logica dell’app
│  ├─ dataFiles.js          # PDF, backup JSON e validazione
│  └─ styles.css            # Design system e stili responsive
├─ index.html
├─ package.json
└─ README.md
```

## Script disponibili

| Comando | Descrizione |
| --- | --- |
| `npm run dev` | Avvia il server di sviluppo con hot reload |
| `npm run build` | Crea la build di produzione in `dist/` |
| `npm run preview` | Serve localmente la build di produzione |

## PWA e funzionamento offline

- Il manifest e le icone permettono di installare l’app su desktop e mobile.
- Il service worker usa una strategia **network-first**: prova prima la rete e usa la cache come fallback.
- Dopo la prima visita le risorse principali restano disponibili offline.
- Per forzare l’aggiornamento di una versione già installata, ricarica l’app; se necessario svuota i dati del sito.

## Note e limiti

- L’app è **locale**: non esiste sincronizzazione tra dispositivi o account cloud.
- La password dell’account è memorizzata in chiaro nel `localStorage`: è adatta a un prototipo o a un uso personale, non a un ambiente con dati sensibili.
- Cancellare i dati del sito comporta la perdita di tutti i dati: usa regolarmente il backup JSON.
- Le immagini molto grandi vengono comunque ridimensionate, ma il `localStorage` ha limiti di spazio variabili per browser.
- Il formato del backup è versionato (`version: 1`) per permettere migrazioni future.

## Risoluzione rapida dei problemi

| Problema | Soluzione |
| --- | --- |
| L’app mostra una versione vecchia | Ricarica con `Ctrl+F5` o svuota i dati del sito |
| Le immagini non si caricano | Verifica che il file sia un’immagine valida e sotto i 10 MB |
| Il ripristino non parte | Assicurati che il file sia un JSON esportato da VolleyScout |
| Il PDF non viene scaricato | Controlla i download del browser e riprova |
| Dati spariti | Ripristina l’ultimo backup da Impostazioni |

## Licenza

Licenza non specificata. Aggiungere un file `LICENSE` prima di distribuire il progetto.
