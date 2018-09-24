DROP TABLE locations, weathers, yelps, movies, meetups, trails;

CREATE TABLE IF NOT EXISTS locations ( 
  id SERIAL PRIMARY KEY, 
  search_query VARCHAR(255), 
  formatted_query VARCHAR(255), 
  latitude NUMERIC(18, 4), 
  longitude NUMERIC(18, 4)
);

CREATE TABLE IF NOT EXISTS weathers ( 
  id SERIAL PRIMARY KEY, 
  forecast VARCHAR(255), 
  time VARCHAR(255), 
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id) 
);

CREATE TABLE IF NOT EXISTS yelps (
  id SERIAL PRIMARY KEY,
  name VARCHAR (255),
  image_url TEXT,
  price VARCHAR (4),
  rating NUMERIC(18, 4),
  url TEXT,
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id) 
);

CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR (255),
  overview TEXT,
  average_votes NUMERIC(18, 4),
  total_votes SMALLINT,
  image_url TEXT,
  popularity NUMERIC(18, 4),
  released_on VARCHAR (10),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id) 
);

CREATE TABLE IF NOT EXISTS meetups (
  id SERIAL PRIMARY KEY,
  link TEXT,
  name VARCHAR (255),
  creation_date VARCHAR (255),
  host VARCHAR (255),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS trails (
  id SERIAL PRIMARY KEY,
  name VARCHAR (255),
  location TEXT, 
  length TEXT, 
  stars TEXT, 
  star_votes TEXT, 
  summary TEXT, 
  trail_url TEXT, 
  conditions TEXT, 
  condition_date VARCHAR(10), 
  condition_time VARCHAR(7), 
  created_at TEXT,
  location_id INTEGER NOT NULL REFERENCES locations(id) 
);
