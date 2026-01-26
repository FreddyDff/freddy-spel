// dependecies



// en express server applikation
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

// miljövariabler och inställningar
// --------------------------------------------------------------
const app = express();

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




// routes
// --------------------------------------------------------------




// för att kunna lyssna på events
// --------------------------------------------------------------
wss.on('connection', (ws) => {


  // info om klienter som autentiserats  - websockets kommunikation ok
  console.log(`A new client connected! Total clients: ${wss.clients.size}`);


  // skicka meddelande till 'browser land'
//   skicka och ta emot data, förutsatt att det är i JSON format

const obj = {msg: "ny klient ansluten 😁"};

  ws.send(JSON.stringify(obj));

// lyssna på event när en klient lämnar kommunikationen
  ws.on('close', () => {

    console.log(`A client disconnected! Total clients: ${wss.clients.size}`);
  });


// lyssna på event av sorten "message"
  ws.on('message', (data) => {

const obj = JSON.parse(data);

console.log(obj);


wss.clients.forEach((client) => {
client.send(JSON.stringify(obj));
});
  });

});

// för att kunna starta servern
// --------------------------------------------------------------
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});