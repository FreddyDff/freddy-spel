// dependecies



// en express server applikation
import express from 'express';

// miljövariabler och inställningar
// --------------------------------------------------------------
const app = express();

// en mapp som express kan använda för att visa upp på webbläsaren(skicka filer)
app.use(express.static('public'));

const port = 8555;



// middleware
// --------------------------------------------------------------




// routes
// --------------------------------------------------------------




// för att kunna lyssna på events
// --------------------------------------------------------------


// för att kunna starta servern
// --------------------------------------------------------------
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});