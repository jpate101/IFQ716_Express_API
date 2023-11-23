
/*const axios = require('axios');

const knexConfig = require('../knexfile');
const knex = require('knex')(knexConfig.development);

async function getMovieData(imdbID) {
  try {
    // Assuming your table is named 'basics' and has a column 'tconst' for IMDb identifiers
    const movieData = await knex('basics').where('tconst', imdbID).first();

    if (movieData) {
      return { error: false, statusCode: 200, data: movieData };
    } else {
      return { error: true, statusCode: 404, message: 'Movie not found' };
    }
  } catch (error) {
    console.error(error);
    return { error: true, statusCode: 500, message: 'Internal Server Error' };
  }
}

module.exports = { getMovieData };*/

const axios = require('axios');
const knexConfig = require('../knexfile');
const knex = require('knex')(knexConfig.development);


async function getMovieData(imdbID) {

    // Function to get movie ratings
    async function getMovieRatings(imdbID) {
        try {
            // Assuming your table for ratings is named 'ratings'
            const ratingsData = await knex('ratings').where('tconst', imdbID).first();

            if (ratingsData) {
                const movieRatings = [
                    {
                        Source: 'Internet Movie Database',
                        Value: `${ratingsData.averageRating}/10`,
                    }
                    // Add more rating sources as needed
                ];

                return movieRatings;
            } else {
                return 'No ratings found';
            }
        } catch (error) {
            console.error(error);
            return 'Unknown'; // Handle errors by returning a default value or an appropriate message
        }
    }
    // Function to get a person's name based on their ID
    async function getPersonName(personId) {
        //console.log('Person ID:', personId);
        try {
            // Assuming your table for people is named 'names'
            if (!personId) {
                return 'Unknown';
            }

            const personData = await knex('names').where('nconst', personId).first();

            if (personData) {
                //console.log(personData.primaryName);
                return personData.primaryName;
            } else {
                return 'Unknown'; // Handle the case where the person is not found
            }
        } catch (error) {
            console.error(error);
            return 'Unknown'; // Handle errors by returning a default value or an appropriate message
        }
    }

    // Function to get a formatted list of actors
    async function getActorsList(imdbID) {
        try {
            // Assuming your table for principals is named 'principals'
            const actorsData = await knex('principals')
                .where({ 'tconst': imdbID, 'category': 'actor' })
                .select('nconst');

            if (actorsData && actorsData.length > 0) {
                const actorsListPromises = actorsData.map(async actor => {
                    const actorName = await getPersonName(actor.nconst);
                    return actorName;
                });

                const actorsList = await Promise.all(actorsListPromises);

                return actorsList.join(', ');
            } else {
                return 'No actors found';
            }
        } catch (error) {
            console.error(error);
            return 'Unknown'; // Handle errors by returning a default value or an appropriate message
        }
    }


    try {
        // Assuming your table is named 'basics' and has appropriate columns
        const movieData = await knex('basics').where('tconst', imdbID).first();
        const movieData_crew = await knex('crew').where('tconst', imdbID).first();
        const movieData_director = await knex('names').where('nconst', movieData_crew.directors);
        //console.log(movieData_crew);
        //console.log("------here-------");
        //console.log(movieData_director);

        const writerIds = movieData_crew.writers.split(',').map(writerId => writerId.trim());

        // Fetch writer names from the names table
        const writerNamesPromises = writerIds.map(async writerId => {
            try {
                const writerData = await knex('names').where('nconst', writerId).first();
                return writerData ? writerData.primaryName : 'Unknown';
            } catch (writerError) {
                console.error('Error fetching writer data:', writerError);
                return 'Unknown';
            }
        });

        // Wait for all promises to resolve
        const writerNames = await Promise.all(writerNamesPromises);

        // Join writer names into a comma-separated string
        const formattedWriterNames = writerNames.join(', ');



        if (movieData) {

            // Transform the data to the desired format
            const formattedMovieData = {
                Title: movieData.primaryTitle || 'Unknown',
                Year: movieData.startYear || 'Unknown',
                Runtime: movieData.runtimeMinutes ? `${movieData.runtimeMinutes} min` : 'Unknown',
                Genre: movieData.genres || 'Unknown',
                Director: movieData_director[0].primaryName,  // Assuming you have a function to get the director's name
                Writer: formattedWriterNames, // Assuming you have a function to get the writer's name
                Actors: await getActorsList(imdbID), // Assuming you have a function to get the list of actors
                Ratings: await getMovieRatings(imdbID), // Assuming you have a function to get movie ratings
            };

            //console.log("-----");
            //console.log(movieData);
            //console.log("-----");
            //console.log(formattedMovieData);
            //console.log("-----");

            return { error: false, statusCode: 200, data: [formattedMovieData] };
        } else {
            return { error: true, statusCode: 404, message: 'Movie not found' };
        }
    } catch (error) {
        console.error(error);
        return { error: true, statusCode: 500, message: 'Internal Server Error' };
    }
}


async function searchMovies(title, year, page) {
    try {
      let query = knex('basics')
        .select('primaryTitle as Title', 'startYear as Year', 'tconst as imdbID', 'titleType as Type')
        .where('primaryTitle', 'like', `%${title}%`);
  
      if (year) {
        query = query.andWhere('startYear', '=', year);
      }
  
      const pageSize = 100; 
      const offset = page ? (page - 1) * pageSize : 0;
  
      const [searchResults, totalCount] = await Promise.all([
        query.offset(offset).limit(pageSize),
        knex('basics').where('primaryTitle', 'like', `%${title}%`).count('tconst as totalCount').first()
      ]);
  
      const pagination = {
        perPage: pageSize,
        currentPage: page || 1,
        from: page ? offset : 0,
        to: page ? offset + searchResults.length : totalCount.totalCount,
        total: totalCount.totalCount
      };
  
      return { error: false, statusCode: 200, data: searchResults, pagination };
    } catch (error) {
      console.error(error);
      return { error: true, statusCode: 500, message: 'Internal Server Error' };
    }
  }
  
  

module.exports = { getMovieData , searchMovies};