// dependecies



// en express server applikation
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

// miljövariabler och inställningar
// --------------------------------------------------------------
const app = express();

// Middleware för att parsa JSON i HTTP requests
app.use(express.json());

// en mapp som express kan använda för att visa upp på webbläsaren(skicka filer)
app.use(express.static('public'));

const port = 8555;



// Skapa en HTTP server och Websocket server
const server = http.createServer(app);


// Skapa en WebSocket server
const wss = new WebSocketServer({ noServer: true });


// Handskakning - godkänn kommunikation via WebSocket
server.on("upgrade", (req, socket, head) => {

  console.log("event upgrade...");

  // bestäm vem som får kommunicera med websocket
  // ex, kolla om man är inloggad
  // if (!isAuthenticated return

  wss.handleUpgrade(req, socket, head, (ws) => {

    console.log("Client:", req.headers['user-agent']);


    // kommunikation ok, skicka vidare event med 'emit'
    // använd händelselyssnare senare i koden
    wss.emit('connection', ws, req);

  });

});





// middleware
// --------------------------------------------------------------
// (express.json() är redan lagt till ovan)

// routes
// --------------------------------------------------------------

// Exempel: Ta emot HTTP POST request
app.post('/api/message', (req, res) => {
  // req.body innehåller nu det parsade JSON-objektet automatiskt
  // tack vare express.json() middleware
  console.log('POST request mottagen:', req.body);
  
  // Exempel: Skicka meddelandet via WebSocket till alla klienter
  if (req.body.msg && req.body.username) {
    const obj = {
      msg: req.body.msg,
      username: req.body.username,
      timestamp: new Date().toISOString()
    };
    
    // Skicka till alla WebSocket-klienter
    broadcast(obj);
    
    // Skicka svar tillbaka till HTTP-klienten
    res.json({ success: true, message: 'Meddelande skickat' });
  } else {
    res.status(400).json({ success: false, error: 'Saknar msg eller username' });
  }
});

// Ytterligare exempel: En enkel GET route
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    clients: wss.clients.size,
    timestamp: new Date().toISOString()
  });
});


// färger för klienter
const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
let clientCount = 0;

// För att kunna lagra klientinformation
const clientColors = new Map();
const clientUsernames = new Map();

// Hjälpfunktion för att skicka meddelanden till alla klienter
function broadcast(data, excludeClient = null) {
  wss.clients.forEach((client) => {
    // Skicka bara till öppna anslutningar
    if (client.readyState === 1) { // WebSocket.OPEN
      // Om excludeClient är angiven, skicka inte till den klienten
      if (excludeClient && client === excludeClient) {
        return;
      }
      client.send(JSON.stringify(data));
    }
  });
}

// för att kunna lyssna på events
// --------------------------------------------------------------
wss.on('connection', (ws) => {


  // tilldelda en unik färg till klienten
  const clientColor = colors[clientCount % colors.length];
  clientCount++;
  clientColors.set(ws, clientColor);

  // info om klienter som autentiserats  - websockets kommunikation ok
  console.log(`A new client connected! Total clients: ${wss.clients.size}`);


  // skicka meddelande till 'browser land'
  //   skicka och ta emot data, förutsatt att det är i JSON format

  const welcomeMsg = { msg: "Välkommen till chatten! 🎉" };
  ws.send(JSON.stringify(welcomeMsg));

  // lyssna på event när en klient lämnar kommunikationen
  ws.on('close', () => {
    const leavingUsername = clientUsernames.get(ws);
    
      // Skicka meddelande till alla andra klienter att någon lämnade
      if (leavingUsername) {
        const leaveMsg = {
          msg: `${leavingUsername} lämnade chatten 👋`,
          isSystemMessage: true,
          timestamp: new Date().toISOString()
        };
      
        broadcast(leaveMsg, ws); // Skicka till alla utom den som lämnade
    }
    
    clientColors.delete(ws);
    clientUsernames.delete(ws);
    console.log(`A client disconnected! Total clients: ${wss.clients.size}`);
  });


  // lyssna på event av sorten "message"
  ws.on('message', (data) => {
    try {
      // eventuellt kontrollera att det verkligen är ett objekt som döljer sig bakom textsträngen. 
      const obj = JSON.parse(data);

      // Spara användarnamnet om det finns
      if (obj.username && !clientUsernames.has(ws)) {
        clientUsernames.set(ws, obj.username);
        
        // Skicka meddelande till alla andra att någon anslöt
        const joinMsg = {
          msg: `${obj.username} anslöt till chatten 🎉`,
          isSystemMessage: true,
          timestamp: new Date().toISOString()
        };
        
        broadcast(joinMsg, ws); // Skicka till alla utom den som anslöt
      }

      // Hämta användarens färg
      const clientColor = clientColors.get(ws) || colors[0];
      
      // Om det är ritdata eller clear-canvas, lägg till färg och skicka vidare
      if (obj.type === 'draw' || obj.type === 'clearCanvas') {
        obj.color = clientColor;
        // Skicka till alla andra klienter (inte till avsändaren)
        broadcast(obj, ws);
        return;
      }

      // För vanliga meddelanden, lägg till färg och tidsstämpel
      obj.color = clientColor;
      obj.timestamp = new Date().toISOString();

      console.log("Mottaget meddelande:", obj);

      // Skicka till alla klienter
      broadcast(obj);
    } catch (error) {
      console.error("Fel vid parsning av meddelande:", error);
    }
  });



});

// för att kunna starta servern
// --------------------------------------------------------------
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});