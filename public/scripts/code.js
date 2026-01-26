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
});


// aktivera lyssnare på input#msg: kan användas för att visa att ngn skriver..
msgElement.addEventListener("keydown", (e) => {
  console.log("Ngn skriver", e.key);


// hantera att en person skriver ngt - kan kanske skickas som en händelse backend.

});


// funktioner


