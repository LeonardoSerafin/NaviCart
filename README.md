# 🧭 NaviCart — In-Store Grocery Navigator & Route Optimizer

> **NaviCart** è una web app mobile-first per smartphone con grafica "Carta & Inchiostro" e **supporto bilingue (Italiano 🇮🇹 / English 🇬🇧)** che trasforma la tua lista della spesa nel percorso pedonale ottimale all'interno del supermercato, guidandoti corsia per corsia e facendoti risparmiare tempo ed evitare avanti-e-indietro tra gli scaffali.

---

## 📱 Architettura a 3 Macro Schermate

L'applicazione è strutturata attorno a una **Navbar gerarchica a 3 elementi**:

```
[ BOTTOM NAVBAR ]
├── 1. HOME (Supermercati Vicini)
│    └── 1.1 CATALOGO SUPERMERCATO & AGGIUNTA A LISTA (/store/:storeId)
│         ├── Catalogo con grandi marche italiane & prezzi
│         ├── Barra di ricerca, Filtri (In Sconto, Bio, Del Territorio) & Ordinamento (Prezzo, Consigliati)
│         └── Aggiunta a lista esistente dello store OPPURE creazione nuova lista
│              (Se aperto da 2.1 con il tasto +, modifica specificamente la lista di provenienza)
│
├── 2. LE MIE LISTE (/lists)
│    ├── Visualizzazione di tutte le liste raggruppate per Supermercato
│    └── 2.1 DETTAGLIO LISTA & NAVIGAZIONE IN CORSIA (/lists/:listId)
│         ├── SEZIONE IN ALTO: Mappa 2D a corsie con Percorso Ottimizzato (TSP) + Tempo e Distanza Risparmiati
│         └── SEZIONE IN BASSO: Lista articoli con comandi rapidi (+ / - quantità, elimina, spunta)
│              └── Tasto [+ Aggiungi Prodotti] che rimanda alla 1.1 per modificare la lista
│
└── 3. ACCOUNT (/account)
     ├── Profilo & Impostazioni
     ├── Selettore Doppia Lingua (🇮🇹 Italiano / 🇬🇧 English)
     ├── Statistiche di Risparmio (ore e metri evitati con NaviCart)
     └── Ripristino Dati Demo Iniziali
```

---

## 💻 Come Avviare l'App in Locale

```bash
npm install
npm run dev
```
Apri **[http://localhost:5173](http://localhost:5173)** sul tuo browser (attiva la modalità Smartphone `Ctrl+Shift+M` per l'esperienza mobile nativa).

---

## 🌐 Come Ospitare l'App Online (Vercel o Netlify)

Il progetto è preconfigurato per Vercel (`vercel.json`) e Netlify (`public/_redirects`).

1. Carica su GitHub.
2. Collega il repository a [vercel.com](https://vercel.com) (imposta Root Directory su `grocery-app`).
3. Clicca Deploy per ottenere il link live da condividere con docenti e colleghi per i feedback!
