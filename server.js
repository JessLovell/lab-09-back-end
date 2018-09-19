`use strict`;

//Application dependencies
const express = require('express');

const superagent = require('superagent');
const cors = require('cors');

//this allows us to join front-end and back-end files from different folders

//loads environment variables from .env
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;
app.use(cors());


app.get('/location', (request, response) => {
  searchToLatLong(request.query.data)
    .then(location => response.send(location))
    .catch(error => handleError(error, response));
})

app.listen(PORT, () => console.log(`Listsening on ${PORT}`));

//Helper Functions
function searchToLatLong(query) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GOOGLE_API_KEY}`;

  return superagent.get(url)
    .then(result => {
      return {
        search_query: query,
        formatted_query: result.body.results[0].formatted_address,
        latitude: result.body.results[0].geometry.location.lat,
        longitude: result.body.results[0].geometry.location.lng
      }
    })
    .catch(error => handleError(error));
}

function handleError(error, response) {
  console.error(error);
  if(response) return response.status(500).send('Sorry something went terribly wrong.');
}