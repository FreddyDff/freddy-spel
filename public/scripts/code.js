// DOM element

const form = document.querySelector('form');
const msgElement = document.querySelector("input#msg");
const chatElement = document.querySelector("div#chat");


// dependecies - WebSocket
const websocket = new WebSocket("ws://localhost:8555");



// variabler, inställningar








// händelse lyssnare

// se till att avbryta förvald händelse när knappen skicka klickas
form.addEventListener('submit', (e) => {
  e.preventDefault();

  console.log("och nu då...");

// skicka ett meddelande via websocket
const msg = msgElement.value;


const obj = {msg: msg};

websocket.send(JSON.stringify(obj));




});

// aktivera lyssnare på input#msg: kan användas för att visa att ngn skriver..
msgElement.addEventListener("keydown", (e) => {
  console.log("Ngn skriver", e.key);


// hantera att en person skriver ngt - kan kanske skickas som en händelse backend.

});


// aktivera lyssnare på socket events
websocket.addEventListener("message", (e) => {

  const data = e.data;

//   skicka och ta emot data, förutsatt att det är i JSON format
const obj = JSON.parse(e.data);
console.log("Meddelande från server:", obj);

renderChatMessage(obj);

});

// funktioner

function renderChatMessage(obj) {

// chatElement.innerHTML += `<p class="">${obj.msg}</p>`;

const p = document.createElement("p");
p.textContent = obj.msg;

 // använd färgen från servern
  if (obj.color) {
    p.style.color = obj.color;
  }

chatElement.appendChild(p);

}
