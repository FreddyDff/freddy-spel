// DOM element
const formUsername = document.querySelector('#formUsername');
const formMessage = document.querySelector('#formMessage');
const usernameInput = document.querySelector('#username');
const msgElement = document.querySelector("#msg");
const chatElement = document.querySelector("#chat");
const chatStage = document.querySelector("#chatStage");

// variabler, inställningar
let username = '';
let websocket = null;
let lastSentMessage = null; // För att hålla koll på senaste skickade meddelandet

// händelse lyssnare

// Hantera användarnamnsformulär
formUsername.addEventListener('submit', (e) => {
  e.preventDefault();
  
  username = usernameInput.value.trim();
  
  if (username) {
    // Dölj användarnamnsformuläret och visa chatten
    formUsername.style.display = 'none';
    chatStage.classList.remove('hidden');
    
    // Anslut till WebSocket
    connectWebSocket();
  }
});

// Hantera meddelandeformulär
formMessage.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    console.log("WebSocket är inte ansluten");
    return;
  }

  const msg = msgElement.value.trim();
  
  if (msg) {
    // Skapa meddelandeobjekt för lokal rendering
    const localObj = {
      msg: msg,
      username: username,
      timestamp: new Date().toISOString(),
      isLocal: true // Flagga för att veta att det är lokalt
    };

    // Spara referens till senaste skickade meddelandet
    lastSentMessage = { msg: msg, timestamp: Date.now() };

    // Rendera meddelandet direkt lokalt (optimistic UI)
    renderChatMessage(localObj);
    
    // Skicka meddelandet via websocket
    websocket.send(JSON.stringify({
      msg: msg,
      username: username
    }));
    
    // Rensa inputfältet
    msgElement.value = '';
  }
});

// Aktivera lyssnare på input#msg: kan användas för att visa att ngn skriver..
msgElement.addEventListener("keydown", (e) => {
  console.log("Ngn skriver", e.key);
  // hantera att en person skriver ngt - kan kanske skickas som en händelse backend.
});

// Funktioner

function connectWebSocket() {
  websocket = new WebSocket("ws://localhost:8555");

  // När anslutningen är öppen
  websocket.addEventListener("open", () => {
    console.log("Ansluten till servern");
  });

  // När meddelande tas emot
  websocket.addEventListener("message", (e) => {
    const obj = JSON.parse(e.data);
    console.log("Meddelande från server:", obj);
    
    // Om det är ett systemmeddelande, rendera det alltid
    if (obj.isSystemMessage) {
      renderChatMessage(obj);
      return;
    }
    
    // Om meddelandet är från oss själva och vi nyligen skickade det,
    // hoppa över att rendera det igen för att undvika dubbletter
    // (vi har redan renderat det lokalt)
    if (obj.username === username && lastSentMessage) {
      const timeDiff = Date.now() - lastSentMessage.timestamp;
      // Om meddelandet matchar och är skickat inom de senaste 2 sekunderna
      if (obj.msg === lastSentMessage.msg && timeDiff < 2000) {
        // Ta bort det lokala meddelandet och ersätt med serverns version
        // (som har rätt färg från servern)
        removeLastLocalMessage();
        renderChatMessage(obj);
        lastSentMessage = null;
        return;
      }
    }
    
    // Rendera meddelandet från servern
    renderChatMessage(obj);
  });

  // Vid fel
  websocket.addEventListener("error", (error) => {
    console.error("WebSocket fel:", error);
  });

  // Vid stängning
  websocket.addEventListener("close", () => {
    console.log("WebSocket anslutning stängd");
  });
}

// Funktion för att ta bort senaste lokala meddelandet
function removeLastLocalMessage() {
  // Hitta alla meddelanden och ta bort det sista som är lokalt
  const messages = chatElement.querySelectorAll('p');
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgContainer = messages[i].querySelector('.message-container');
    if (msgContainer) {
      const usernameSpan = msgContainer.querySelector('.message-username');
      if (usernameSpan && usernameSpan.textContent === username) {
        messages[i].remove();
        break;
      }
    }
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  // Formatera tid (HH:MM)
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  
  // Om det är idag, visa bara tiden
  if (messageDate.getTime() === today.getTime()) {
    return timeStr;
  }
  
  // Om det är igår
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (messageDate.getTime() === yesterday.getTime()) {
    return `Igår ${timeStr}`;
  }
  
  // Annars visa datum och tid
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month} ${timeStr}`;
}

function renderChatMessage(obj) {
  const p = document.createElement("p");
  const timestamp = formatTimestamp(obj.timestamp);
  
  // Om det är ett systemmeddelande (när någon ansluter/lämnar)
  if (obj.isSystemMessage) {
    p.className = 'system-message';
    const span = document.createElement('span');
    span.textContent = obj.msg;
    p.appendChild(span);
    if (timestamp) {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'message-time';
      timeSpan.textContent = ` (${timestamp})`;
      p.appendChild(timeSpan);
    }
    p.style.fontStyle = 'italic';
    p.style.opacity = '0.7';
  } else {
    // Vanligt meddelande
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container';
    
    // Använd färgen från servern
    if (obj.color) {
      messageContainer.style.borderLeftColor = obj.color;
    }
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Visa användarnamn om det finns
    if (obj.username) {
      const usernameSpan = document.createElement('span');
      usernameSpan.className = 'message-username';
      usernameSpan.textContent = obj.username;
      if (obj.color) {
        usernameSpan.style.color = obj.color;
      }
      messageContent.appendChild(usernameSpan);
      
      const textSpan = document.createElement('span');
      textSpan.className = 'message-text';
      textSpan.textContent = `: ${obj.msg}`;
      messageContent.appendChild(textSpan);
    } else {
      const textSpan = document.createElement('span');
      textSpan.className = 'message-text';
      textSpan.textContent = obj.msg;
      messageContent.appendChild(textSpan);
    }
    
    messageContainer.appendChild(messageContent);
    
    // Lägg till tidsstämpel
    if (timestamp) {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'message-time';
      timeSpan.textContent = timestamp;
      messageContainer.appendChild(timeSpan);
    }
    
    p.appendChild(messageContainer);
  }

  chatElement.appendChild(p);
  
  // Scrolla ner till senaste meddelandet
  chatElement.scrollTop = chatElement.scrollHeight;
}
