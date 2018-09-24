`use strict`;

const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const pg = require('pg');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT;
const client = new pg.Client(process.env.DATABASE_URL);

app.use(cors());

client.connect();
client.on('error', err => console.error(err));

app.get('/location', getLocation);
app.get('/weather', getWeather);
app.get('/yelp', getYelp);
app.get('/movies', getMovie);
app.get('/meetup', getMeetup);
app.get('/trails', getTrail);

app.listen(PORT, () => console.log(`Listsening on ${PORT}`));

function getLocation (request, response){
  Location.lookupLocation({
    tableName: Location.tableName,
    query: request.query.data,

    cacheHit: function (result) {
      response.send(result);
    },

    cacheMiss: function () {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${this.query}&key=${process.env.GOOGLE_API_KEY}`;
      return superagent.get(url)
        .then (result => {
          const location = new Location(this.query, result);
          location.save()
            .then(location => response.send(location));
        })
        .catch(error => handleError(error));
    }
  })
}

let lookup = function(options) {
  const SQL = `SELECT * FROM ${options.tableName} WHERE location_id=$1;`;
  const values = [options.location];

  client.query(SQL, values)
    .then(result => {
      if(result.rowCount > 0) {
        options.cacheHit(result.rows);
      } else {
        options.cacheMiss();
      }
    })
    .catch(error => handleError(error));
}

Weather.lookup = lookup;
Yelp.lookup = lookup;
Movie.lookup = lookup;
Meetup.lookup = lookup;
Trail.lookup = lookup;

Weather.deleteByLocationId = deleteByLocationId;
Yelp.deleteByLocationId = deleteByLocationId;
Movie.deleteByLocationId = deleteByLocationId;
Meetup.deleteByLocationId = deleteByLocationId;
Trail.deleteByLocationId = deleteByLocationId;

Weather.tableName = 'weathers';
Yelp.tableName = 'yelps';
Movie.tableName = 'movies';
Meetup.tableName = 'meetups';
Trail.tableName = 'trails';

function getWeather (request, response) {
  Weather.lookup({
    tableName: Weather.tableName,
    cacheMiss: function () {
      const url = `https://api.darksky.net/forecast/${process.env.DARK_SKY_API}/${request.query.data.latitude},${request.query.data.longitude}`

      superagent.get(url)
        .then(result => {
          const weatherSummaries = result.body.daily.data.map(day => {
            const summary = new Weather(day);
            summary.save(request.query.data.id);
            return summary;
          });
          response.send(weatherSummaries);
        })
        .catch(error => handleError(error, response));
    },
    cacheHit: function(resultsArray){
      let ageOfResultsInMinutes = (Date.now()-resultsArray[0].created_at)/(1000*60);
      if(ageOfResultsInMinutes > 30) {
        Weather.deleteByLocationId(Weather.tableName, request.query.data.id);
        this.cacheMiss();
      } else {
        response.send(resultsArray);
      }
    }
  });
}

function getYelp (request, response) {
  Yelp.lookup({
    tableName: Yelp.tableName,
    cacheMiss: function () {
      const url = `https://api.yelp.com/v3/businesses/search?location=${request.query.data.search_query}`;

      superagent.get(url)
        .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
        .then((result) => {
          const yelpSummaries = result.body.businesses.map(food => {
            let summary = new Yelp(food);
            summary.save(request.query.data.id);
            return summary
          })
          response.send(yelpSummaries);
        })
        .catch(error => handleError(error, response));
    },
    cacheHit: function(resultsArray) {
      let ageOfResultsInMinutes = (Date.now()-resultsArray[0].created_at)/(1000*60);
      if(ageOfResultsInMinutes>1440) {
        Yelp.deleteByLocationId(Yelp.tableName, request.query.data.id);
        this.cacheMiss();
      } else {
        response.send(resultsArray);
      }
    }
  });
}

function getMovie (request, response) {
  Movie.lookup({
    tableName: Movie.tableName,
    cacheMiss: function() {
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.THE_MOVIE_DB_API}&query=${request.query.data.search_query}`;

      superagent.get(url)
        .then((result) => {
          const movieSummaries = result.body.results.map( movie => {
            let summary = new Movie(movie);
            summary.save(request.query.data.id);
            return summary;
          })
          response.send(movieSummaries);
        })
        .catch(error => handleError(error, response));
    },
    cacheHit: function (resultsArray) {
      let ageOfResultsInMinutes = (Date.now() - resultsArray[0].created_at) / (1000*60);
      if (ageOfResultsInMinutes > 10080){
        Movie.deleteByLocationId(Movie.tableName, request.query.data.id);
        this.cacheMiss();
      } else {
        response.send(resultsArray);
      }
    }
  });
}


function getMeetup (request, response) {
  Meetup.lookup ({
    tableName: Meetup.tableName,
    cacheMiss: function () {
      const url = `https://api.meetup.com/find/upcoming_events?&sign=true&photo-host=public&lon=${request.query.data.longitude}&page=20&lat=${request.query.data.latitude}&key=${process.env.MEETUP_API_KEY}`;

      superagent.get(url)
        .then((result) => {
          const meetupSummaries = result.body.events.map( event => {
            let summary = new Meetup(event);
            summary.save(request.query.data.id);
            return summary;
          })
          response.send(meetupSummaries);
        })
        .catch(error => handleError(error, response));
    },
    cacheHit: function (resultsArray) {
      let ageOfResultsInMinutes = (Date.now() - resultsArray[0].created_at) / (1000*60);
      if (ageOfResultsInMinutes > 10080) {
        Meetup.deleteByLocationId(Meetup.tableName, request.query.data.id);
        this.cacheMiss();
      } else {
        response.send(resultsArray);
      }
    }
  });
}

function getTrail (request, response) {
  Trail.lookup({
    tableName: Trail.tableName,
    cacheMiss: function () {
      const url = `https://www.hikingproject.com/data/get-trails?lat=${request.query.data.latitude}&lon=${request.query.data.longitude}&maxDistance=10&key=${process.env.HIKING_API_KEY}`;

      superagent.get(url)
        .then(result => {
          const trailSummaries = result.body.trails.map( trail => {
            let summary = new Trail(trail);
            summary.save(request.query.data.id);
            return summary;
          })
          response.send(trailSummaries);
        })
        .catch(error => handleError(error, response));
    },
    cacheHit: function(resultsArray) {
      let ageOfResultsInMinutes = (Date.now() - resultsArray[0].created_at) / (1000*60);
      if (ageOfResultsInMinutes > 60) {
        Trail.deleteByLocationId(Trail.tableName, request.query.data.id);
        this.cacheMiss();
      } else {
        response.send(resultsArray);
      }
    }
  });
}

function handleError (error, response) {
  console.error(error);
  if(response) return response.status(500).send('Sorry something went terribly wrong.');
}

function deleteByLocationId (table, city) {
  const SQL = `DELETE from ${table} WHERE location_id=${city};`;
  return client.query(SQL);
}

//Constructors
function Location (query, result) {
  this.search_query = query;
  this.formatted_query = result.body.results[0].formatted_address;
  this.latitude = result.body.results[0].geometry.location.lat;
  this.longitude = result.body.results[0].geometry.location.lng;
  this.created_at = Date.now()
}

Location.lookupLocation = (location) => {
  const SQL = `SELECT * FROM locations WHERE search_query=$1;`;
  const values = [location.query];

  return client.query(SQL, values)
    .then(result => {
      if (result.rowCount > 0){
        location.cacheHit(result.rows[0]);
      } else {
        location.cacheMiss();
      }
    })
    .catch(console.error);
}

Location.prototype = {
  save: function () {
    const SQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING id;`;
    const values = [this.search_query, this.formatted_query, this.latitude, this.longitude];

    return client.query(SQL, values)
      .then( result => {
        this.id = result.rows[0].id;
        return this;
      });
  }
};

function Weather (day) {
  this.tableName = 'weathers';
  this.created_at = Date.now();
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
  this.forecast = day.summary;
}

function Yelp (food) {
  this.tableName = 'yelps';
  this.name = food.name;
  this.image_url = food.image_url;
  this.price = food.price;
  this.rating = food.rating;
  this.url = food.url;
  this.created_at = Date.now();
}

function Movie (film) {
  this.tableName = 'movies';
  this.title = film.title;
  this.overview = film.overview;
  this.average_votes = film.vote_average;
  this.total_votes = film.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${film.poster_path}`;
  this.popularity = film.popularity;
  this.released_on = film.release_date;
  this.created_at = Date.now();
}

function Trail (hike) {
  this.tableName = 'trails'
  this.name = hike.name;
  this.location = hike.location;
  this.length = hike.length;
  this.stars = hike.stars;
  this.star_votes = hike.starVotes;
  this.summary = hike.summary;
  this.trail_url = hike.url;
  this.conditions = hike.conditionDetails;
  this.condition_date = hike.conditionDate.split(' ')[0];
  this.condition_time = hike.conditionDate.split(' ')[1];
  this.created_at = Date.now();
}

function Meetup (event) {
  this.tableName = 'meetups';
  this.link = event.link;
  this.name = event.name;
  this.creation_date = event.creation_date;
  this.host = event.host;
  this.created_at = Date.now();
}

Weather.prototype = {
  save: function(location_id){
    const SQL = `INSERT INTO ${this.tableName} (forecast, time, created_at, location_id) VALUES ($1, $2, $3, $4);`;
    const values = [this.forecast, this.time, this.created_at, location_id];
    client.query(SQL, values);
  }
}

Yelp.prototype = {
  save: function(location_id){
    const SQL = `INSERT INTO ${this.tableName} (name, image_url, price, rating, url, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7);`;
    const values = [this.name, this.image_url, this.price, this.rating, this.url, this.created_at, location_id];
    client.query(SQL, values);
  }
}

Movie.prototype = {
  save: function(location_id) {
    const SQL = `INSERT INTO ${this.tableName} (title, overview, average_votes, total_votes, image_url, popularity, released_on, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`;
    const values = [this.title, this.overview, this.average_votes, this.total_votes, this.image_url, this.popularity, this.released_on, this.created_at, location_id];
    client.query(SQL, values);
  }
}

Trail.prototype = {
  save: function(location_id){
    const SQL = `INSERT INTO ${this.tableName} (name, location, length, stars, star_votes, summary, trail_url, conditions, condition_date, condition_time, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) LIMIT 5;`;
    const values = [this.name, this.location, this.length, this.stars, this.star_votes, this.summary, this.trail_url, this.conditions, this.condition_date, this.condition_time, this.created_at, location_id];
    client.query(SQL, values);
  }
}

Meetup.prototype = {
  save: function(location_id) {
    const SQL = `INSERT INTO ${this.tableName} (link, name, creation_date, host, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6);`;
    const values = [this.link, this.name, this.creation_date, this.host, this.created_at, location_id];
    client.query(SQL, values);
  }
}



