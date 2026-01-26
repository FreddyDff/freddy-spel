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
const wss = new WebSocketServer({ server });


// middleware
// --------------------------------------------------------------




// routes
// --------------------------------------------------------------




// för att kunna lyssna på events
// --------------------------------------------------------------
wss.on('connection', (ws) => {


  // info om klienter som autentiserats  - websockets kommunikation ok
  console.log(`A new client connected! Total clients: ${wss.clients.size}`);


// lyssna på event när en klient lämnar kommunikationen
  ws.on('close', () => {
    console.log(`A client disconnected! Total clients: ${wss.clients.size}`);
  });

});



// för att kunna starta servern
// --------------------------------------------------------------
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});