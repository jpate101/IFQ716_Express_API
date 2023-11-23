const multer = require('multer');
const knexConfig = require('../knexfile');
const knex = require('knex')(knexConfig.development);
const fs = require('fs').promises;
const storage = multer.memoryStorage();
const uploadPosterMiddleware = multer({ storage: storage }).single('poster');

async function uploadPosterToDatabase(imdbId, file) {
  try {
    if (!file || !file.buffer) {
      return { error: true, statusCode: 400, message: 'File is missing or invalid' };
    }

    const existingPoster = await knex('movie_posters').where('imdb_id', imdbId).first();
    if (existingPoster) {
      // Update the existing poster in the database
      await knex('movie_posters')
        .where('imdb_id', imdbId)
        .update({ poster_data: file.buffer, updated_at: knex.fn.now() }); // Assuming you have an 'updated_at' column for tracking updates

      return { error: false, statusCode: 200, message: 'Existing Poster Overwrite Successfully' };
    }
    try {
      await knex('movie_posters').insert({
        imdb_id: imdbId,
        poster_data: file.buffer,
      });
      console.log("Poster Inserted Successfully");
      return { error: false, statusCode: 200, message: 'Poster Uploaded Successfully' };
    } catch (error) {
      //console.error("Error inserting poster into the database:", error);
      console.log("SQL state:", error.sqlState);
      console.log(file);
      console.log(imdbId);
      
      return { error: true, statusCode: 500, message: 'Internal Server Error (error located at poster upload to database)' };
    }

    console.log("here");

    
  } catch (error) {
    //console.error(error);
    return { error: true, statusCode: 500, message: 'Internal Server Error inside of uploadposterstodatabase' };
  }
}

async function downloadPosterFromDatabase(imdbId) {
  try {
    const posterData = await knex('movie_posters').select('poster_data').where('imdb_id', imdbId).first();

    if (!posterData) {
      return { error: true, statusCode: 404, message: 'Poster not found' };
    }

    const tempFilePath = `./temp/${imdbId}_temp.png`; 
    await fs.writeFile(tempFilePath, posterData.poster_data);

    const data = await fs.readFile(tempFilePath);
    await fs.unlink(tempFilePath);

    return { error: false, statusCode: 200, data };
  } catch (error) {
    console.error(error);
    return { error: true, statusCode: 500, message: 'Internal Server Error at posters.js' };
  }
}

module.exports = { uploadPosterToDatabase , uploadPosterMiddleware , downloadPosterFromDatabase};