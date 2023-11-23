DROP TABLE movie_posters;
CREATE TABLE movie_posters (
    imdb_id VARCHAR(15) PRIMARY KEY,
    poster_data LONGBLOB
);