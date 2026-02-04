// DOM element
const formUsername = document.querySelector('#formUsername');
const formMessage = document.querySelector('#formMessage');
const usernameInput = document.querySelector('#username');
const msgElement = document.querySelector("#msg");
const chatElement = document.querySelector("#chat");
const chatStage = document.querySelector("#chatStage");
const backgroundCanvas = document.querySelector('#backgroundCanvas');
const overlayCanvas = document.querySelector('#overlayCanvas');
const canvas = overlayCanvas; // Använd overlayCanvas som standard (för bakåtkompatibilitet)
const brushIndicator = document.querySelector('#brushIndicator');
const colorPicker = document.querySelector('#colorPicker');
const clearCanvasBtn = document.querySelector('#clearCanvas');
const cursorIndicator = document.querySelector('#cursorIndicator');
const brushSound = new Audio('sounds/pen-colouring-34227.mp3');
brushSound.volume = 0.2;

// variabler, inställningar
let username = '';
let websocket = null;
let lastSentMessage = null; // För att hålla koll på senaste skickade meddelandet

// Canvas-ritning variabler
let isDrawing = false;
let backgroundCtx = null; // Context för bakgrunds-canvasen (andras ritningar)
let overlayCtx = null;    // Context för overlay-canvasen (dina ritningar)
let ctx = overlayCtx;      // Tillfälligt för bakåtkompatibilitet
let userColor = null; // Färg som användaren får från servern
let currentBrushSize = 3;
let currentBrushType = 'normal';
let selectedColor = '#000000'; // Standardfärg (svart)
let isEraserMode = false; // true när suddgummi är aktivt
let currentSound = null; // Håll koll på det aktuella ljudet som spelas

// händelse lyssnare

// Hantera användarnamnsformulär
formUsername.addEventListener('submit', (e) => {
  e.preventDefault();
  
  username = usernameInput.value.trim();
  
  if (username) {
    // Dölj användarnamnsformuläret och visa chatten
    formUsername.style.display = 'none';
    chatStage.classList.remove('hidden');
    
    // Initiera ritblocket
    initCanvas();
    
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
// // msgElement.addEventListener("keydown", (e) => {
// //   console.log("Ngn skriver", e.key);
//   // hantera att en person skriver ngt - kan kanske skickas som en händelse backend.
// });

// Canvas-ritning händelse lyssnare
const brushSizeSelect = document.querySelector('#brushSize');
const brushTypeSelect = document.querySelector('#brushType');
const eraserBtn = document.querySelector('#eraserBtn');

if (brushSizeSelect) {
  brushSizeSelect.addEventListener('change', (e) => {
    currentBrushSize = parseInt(e.target.value);
  });
}

if (brushTypeSelect) {
  brushTypeSelect.addEventListener('change', (e) => {
    currentBrushType = e.target.value;
    updateBrushIndicator();
  });
}

colorPicker.addEventListener('change', (e) => {
  selectedColor = e.target.value;
});


clearCanvasBtn.addEventListener('click', () => {
  if (overlayCtx) {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Skicka clear-kommando till alla andra användare
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: 'clearCanvas',
        username: username
      }));
    }
  }
});

eraserBtn.addEventListener('click', () => {
  isEraserMode = !isEraserMode; // Växla mellan true och false
  
  // Ändra knappens utseende för att visa om suddgummi är aktivt
  if (isEraserMode) {
    eraserBtn.style.backgroundColor = '#ff6b6b'; // Röd när aktivt
  } else {
    eraserBtn.style.backgroundColor = ''; // Normal färg när inaktivt
  }
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
    
    // Om det är ritdata
    if (obj.type === 'draw') {
      handleRemoteDrawing(obj);
      return;
    }
    
    // Om det är clear-canvas kommando
    if (obj.type === 'clearCanvas') {
      // Om det är vår egen rensning, har vi redan rensat overlayCanvas lokalt
      // Om det är någon annans rensning, rensa deras ritningar från backgroundCanvas
      if (obj.username !== username && backgroundCtx) {
        // Rensa hela backgroundCanvas (eftersom vi inte kan selektivt rensa en användares ritningar)
        backgroundCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
      }
      return;
    }
    
    // Spara användarens färg om den skickas från servern
    if (obj.color && obj.username === username && !userColor) {
      userColor = obj.color;
      // Uppdatera canvas-färg
      if (overlayCtx) {
        overlayCtx.strokeStyle = userColor;
      }
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

// Hantera ritdata från andra användare
function handleRemoteDrawing(data) {
  if (!backgroundCtx) return;
  
  // Ignorera ritningar från oss själva (vi har redan ritat dem lokalt)
  if (data.username === username) {
    return;
  }
  
  // Spara nuvarande inställningar på backgroundCtx
  const savedStrokeStyle = backgroundCtx.strokeStyle;
  const savedLineWidth = backgroundCtx.lineWidth;
  const savedLineCap = backgroundCtx.lineCap;
  const savedLineJoin = backgroundCtx.lineJoin;
  const savedGlobalAlpha = backgroundCtx.globalAlpha;
  
  // Sätt färg och penselinställningar för denna användare på backgroundCtx
  backgroundCtx.strokeStyle = data.color;
  backgroundCtx.lineWidth = data.brushSize || 3;
  backgroundCtx.lineCap = 'round';
  backgroundCtx.lineJoin = 'round';
  
  // Sätt penseltyp (opacity)
  if (data.brushType === 'marker') {
    backgroundCtx.globalAlpha = 0.5;
  } else if (data.brushType === 'pen') {
    backgroundCtx.globalAlpha = 0.8;
  } else {
    backgroundCtx.globalAlpha = 1.0;
  }
  
   // Sätt suddgummi-läge för andras ritningar
   if (data.isEraser) {
    backgroundCtx.globalCompositeOperation = 'destination-out';
  } else {
    backgroundCtx.globalCompositeOperation = 'source-over';
  }


  if (data.action === 'start') {
    backgroundCtx.beginPath();
    backgroundCtx.moveTo(data.x, data.y);
  } else if (data.action === 'move') {
    backgroundCtx.lineTo(data.x, data.y);
    backgroundCtx.stroke();
  } else if (data.action === 'stop') {
    // Inget särskilt att göra vid stop
  }
  
  // Återställ inställningar på backgroundCtx
  backgroundCtx.strokeStyle = savedStrokeStyle;
  backgroundCtx.lineWidth = savedLineWidth;
  backgroundCtx.lineCap = savedLineCap;
  backgroundCtx.lineJoin = savedLineJoin;
  backgroundCtx.globalAlpha = savedGlobalAlpha;
}

// Canvas-ritning funktioner
function initCanvas() {
  if (!backgroundCanvas || !overlayCanvas) return;
  
  // Sätt storlek på båda canvasarna
  backgroundCanvas.width = 800;
  backgroundCanvas.height = 400;
  overlayCanvas.width = 800;
  overlayCanvas.height = 400;
  
  // Hämta context för båda canvasarna
  backgroundCtx = backgroundCanvas.getContext('2d');
  overlayCtx = overlayCanvas.getContext('2d');
  ctx = overlayCtx; // Uppdatera ctx för bakåtkompatibilitet
  
  // ... resten av koden (sätt standardinställningar på overlayCtx)

  
  // Sätt standardinställningar på overlayCtx (färgen uppdateras när den kommer från servern)
  overlayCtx.strokeStyle = '#000000';
  overlayCtx.lineWidth = currentBrushSize;
  overlayCtx.lineCap = 'round';
  overlayCtx.lineJoin = 'round';
  overlayCtx.globalAlpha = 1.0;
  
  // Event listeners för mus (på overlayCanvas - där användaren ritar)
  overlayCanvas.addEventListener('mousedown', startDrawing);
  overlayCanvas.addEventListener('mousemove', updateCursorIndicator);
  overlayCanvas.addEventListener('mousemove', draw);
  overlayCanvas.addEventListener('mouseup', stopDrawing);
  overlayCanvas.addEventListener('mouseout', (e) => {
    stopDrawing();
    hideCursorIndicator();
  });
  overlayCanvas.addEventListener('mouseenter', showCursorIndicator);
  
  // Event listeners för touch (mobil)
  overlayCanvas.addEventListener('touchstart', handleTouch);
  overlayCanvas.addEventListener('touchmove', handleTouch);
  overlayCanvas.addEventListener('touchend', stopDrawing);

  updateBrushIndicator();
}

function getMousePos(e) {
  const rect = overlayCanvas.getBoundingClientRect();
  // Enkel beräkning - skalning mellan canvas storlek och visningsstorlek
  const scaleX = overlayCanvas.width / rect.width;
  const scaleY = overlayCanvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function getTouchPos(e) {
  const rect = overlayCanvas.getBoundingClientRect();
  const touch = e.touches[0] || e.changedTouches[0];
  // Enkel beräkning - skalning mellan canvas storlek och visningsstorlek
  const scaleX = overlayCanvas.width / rect.width;
  const scaleY = overlayCanvas.height / rect.height;
  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY
  };
}

// Funktioner för cursor-indikator
function updateCursorIndicator(e) {
  if (!cursorIndicator) return;
  cursorIndicator.style.left = e.clientX + 'px';
  cursorIndicator.style.top = e.clientY + 'px';
  cursorIndicator.classList.add('active');
}

function showCursorIndicator() {
  if (cursorIndicator) {
    cursorIndicator.classList.add('active');
  }
}

function hideCursorIndicator() {
  if (cursorIndicator) {
    cursorIndicator.classList.remove('active');
  }
}

function applyBrushSettings() {

   // Sätt suddgummi-läge
   if (isEraserMode) {
    overlayCtx.globalCompositeOperation = 'destination-out'; // Ta bort pixlar
  } else {
    overlayCtx.globalCompositeOperation = 'source-over'; // Normal ritning
  }

  // Sätt penselstorlek på overlayCtx (där användaren ritar)
  overlayCtx.lineWidth = currentBrushSize;
  
  // Sätt penseltyp (opacity för olika effekter)
  if (currentBrushType === 'marker') {
    overlayCtx.globalAlpha = 0.5; // Marker är mer transparent
  } else if (currentBrushType === 'pen') {
    overlayCtx.globalAlpha = 0.8; // Penna är lite transparent
  } else {
    overlayCtx.globalAlpha = 1.0; // Normal är helt opak
  }
  
  // Använd användarens färg om den finns, annars svart
  // if (userColor) {
  //   overlayCtx.strokeStyle = userColor;
  // } else {
  //   overlayCtx.strokeStyle = selectedColor;
  // }
  overlayCtx.strokeStyle = selectedColor;
}

function updateBrushIndicator() {
  if (currentBrushType === 'normal') {
    brushIndicator.textContent = 'Normal';
} else if (currentBrushType === 'marker') {
    brushIndicator.textContent = 'Marker';
} else if (currentBrushType === 'pen') {
    brushIndicator.textContent = 'Penna';
}
};


function playBrushSound() {
  const sound = brushSound.cloneNode(); // Klona ljudet
  sound.volume = 0.2;
  sound.play().catch(e => {
    // Ignorera fel om ljudet inte kan spelas (t.ex. användaren har inte interagerat med sidan ännu)
    console.log("Kunde inte spela ljud:", e);
  });
  return sound; // Returnera ljudet så vi kan stoppa det senare
}

function startDrawing(e) {
  e.preventDefault(); // Förhindra standardbeteende
  
  // Stoppa eventuellt pågående ritning först
  if (isDrawing) {
    stopDrawing();
  }
  
  currentSound = playBrushSound(); // Spela ljud och spara referensen
  isDrawing = true;
  const pos = getMousePos(e);
  
  // Applicera penselinställningar
  applyBrushSettings();
  
  overlayCtx.beginPath();
  overlayCtx.moveTo(pos.x, pos.y);
  
  // Skicka ritdata till servern (inklusive penselinfo)
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify({
      type: 'draw',
      action: 'start',
      x: pos.x,
      y: pos.y,
      username: username,
      brushSize: currentBrushSize,
      brushType: currentBrushType,
      color: selectedColor,
      isEraser: isEraserMode
    }));
  }
}

function draw(e) {
  if (!isDrawing) return;
  
  e.preventDefault(); // Förhindra standardbeteende
  
  const pos = getMousePos(e);
  overlayCtx.lineTo(pos.x, pos.y);
  overlayCtx.stroke();
  
  // Skicka ritdata till servern (inklusive penselinfo)
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify({
      type: 'draw',
      action: 'move',
      x: pos.x,
      y: pos.y,
      username: username,
      brushSize: currentBrushSize,
      brushType: currentBrushType,
      color: selectedColor,
      isEraser: isEraserMode
    }));
  }
}

function stopDrawing(e) {
  // Stoppa ritningen oavsett om isDrawing är true eller false
  // (för att säkerställa att den alltid stoppas)
  if (isDrawing) {
    isDrawing = false;
    
    // Stoppa ljudet om det finns
    if (currentSound) {
      currentSound.pause();
      currentSound.currentTime = 0;
      currentSound = null;
    }
    
    // Skicka stop-signal till servern
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: 'draw',
        action: 'stop',
        username: username
      }));
    }
  }
}

function handleTouch(e) {
  e.preventDefault();
  const touch = e.touches[0] || e.changedTouches[0];
  const pos = getTouchPos(e);
  
  if (e.type === 'touchstart') {
    isDrawing = true;
    currentSound = playBrushSound(); // Spela ljud och spara referensen
    
    // Applicera penselinställningar
    applyBrushSettings();
    
    overlayCtx.beginPath();
    overlayCtx.moveTo(pos.x, pos.y);
    
    // Skicka ritdata till servern (inklusive penselinfo)
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: 'draw',
        action: 'start',
        x: pos.x,
        y: pos.y,
        username: username,
        brushSize: currentBrushSize,
        brushType: currentBrushType,
        color: selectedColor,
        isEraser: isEraserMode
      }));
    }
  } else if (e.type === 'touchmove' && isDrawing) {
    overlayCtx.lineTo(pos.x, pos.y);
    overlayCtx.stroke();
    
    // Skicka ritdata till servern (inklusive penselinfo)
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: 'draw',
        action: 'move',
        x: pos.x,
        y: pos.y,
        username: username,
        brushSize: currentBrushSize,
        brushType: currentBrushType
      }));
    }
  } else if (e.type === 'touchend') {
    if (isDrawing) {
      isDrawing = false;
      
      // Stoppa ljudet om det finns
      if (currentSound) {
        currentSound.pause();
        currentSound.currentTime = 0;
        currentSound = null;
      }
      
      // Skicka stop-signal till servern
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: 'draw',
          action: 'stop',
          username: username
        }));
      }
    }
  }
}
