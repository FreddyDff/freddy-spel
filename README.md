# Freddy-spel

## Om projektet

Freddy-spel är en interaktiv, realtidsbaserad webbapplikation där flera användare kan rita tillsammans på ett gemensamt canvas-element samtidigt som de chattar med varandra. Applikationen är byggd med Node.js, Express och WebSocket för realtidskommunikation.

## Vad är det för sorts spel?

Detta är ett **kollaborativt rit- och chattspel** där användare:
- Kan rita på ett delat ritblock med olika penslar, färger och verktyg
- Kan chatta med varandra i realtid
- Ser varandras ritningar och meddelanden omedelbart
- Får en unik färg som identifierar dem i chatten och på ritblocket

## Funktioner

### Ritfunktioner
- **Olika penslar**: Penna, marker och pensel med olika opacitet
- **Anpassningsbar penselstorlek**: Från tunn (2px) till mycket tjock (12px)
- **Färgväljare**: Välj vilken färg du vill rita med
- **Suddgummi**: Ta bort ritningar med suddgummi-funktionen
- **Rensa canvas**: Rensa hela ritblocket med ett klick
- **Touch-stöd**: Fungerar även på mobila enheter

### Chattfunktioner
- **Realtidschatt**: Meddelanden visas omedelbart för alla användare
- **Emoji-picker**: Välj emojis direkt i chatten
- **Färgkodade meddelanden**: Varje användare har en unik färg
- **Tidsstämplar**: Se när meddelanden skickades
- **Systemmeddelanden**: Automatiska meddelanden när användare ansluter/lämnar

## Teknologier

- **Node.js** - Servermiljö
- **Express** - Webbserver
- **WebSocket (ws)** - Realtidskommunikation
- **HTML5 Canvas** - Ritfunktionalitet
- **Vanilla JavaScript** - Klientlogik

## Hur man startar upp projektet

1. **Installera beroenden:**
   ```bash
   npm install
   ```

2. **Starta servern:**
   ```bash
   npm start
   ```
   Eller för utveckling med automatisk omstart:
   ```bash
   npm run dev
   ```

3. **Öppna webbläsaren:**
   Gå till `http://localhost:8555` i din webbläsare

4. **Anslut flera användare:**
   Öppna flera flikar eller webbläsare för att se hur flera användare kan rita och chatta tillsammans i realtid

## Vad vi fokuserat på

### WebSocket-kommunikation
Funktionaliteten i applikationen är baserad på kommunikation via WebSocket, vilket möjliggör realtidsinteraktion mellan användare utan att behöva uppdatera sidan.

### Gemensam chatt
En användare kan se och skriva meddelanden i en gemensam chatt där alla deltagare ser varandras meddelanden omedelbart.

### Interaktivt canvas-element
En användare kan påverka innehållet i ett canvas-element med mus. Canvas-elementet visar varje användares interaktion i realtid.

### Realtidsuppdateringar
Tillståndet för olika objekt är rimligt uppdaterat för andra klienter. Detta har inneburit flera utmaningar för att hitta en rimlig nivå när det gäller WebSocket-events, animationer och FPS.

### Gemensam upplevelse
Innehållet i canvas-elementet ger användarna en gemensam upplevelse där alla kan se och påverka samma ritblock samtidigt.