//swagger 
const swaggerUI = require('swagger-ui-express');
const swaggerDocument = require('./docs/openapi.json');

// Knex setup
require('dotenv').config();

const multer = require('multer');

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const { registerUser , loginUser , authenticateToken } = require('./routes/Authentication');
const { getMovieData , searchMovies } = require('./routes/Movies'); 
const { uploadPosterToDatabase, uploadPosterMiddleware , downloadPosterFromDatabase } = require('./routes/Posters');

var app = express();

const bodyParser = require('body-parser');
const cors = require('cors');
const knexConfig = require('./knexfile');
const knex = require('knex')(knexConfig.development);

//
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
app.use(helmet());
//
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
//
app.use(logger('dev'));
logger.token('res', (req, res) => {
  const headers = {}
  res.getHeaderNames().map(h => headers[h] = res.getHeader(h))
  return JSON.stringify(headers)
}) 
//swagger 
app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument))

//
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());


// Routes
app.get('/basics', async (req, res) => {
  try {
    // Assuming you have a knex instance named 'knex'
    const basicsData = await knex.select('*').from('basics');
    res.json(basicsData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// New route for user registration
app.post('/user/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: true,
      message: 'Request body incomplete, both email and password are required',
    });
  }

  const registrationResult = await registerUser(email, password);

  if (registrationResult.error) {
    return res.status(registrationResult.statusCode).json({
      error: registrationResult.error,
      message: registrationResult.message,
    });
  }

  return res.status(201).json({
    message: registrationResult.message,
  });
});

// New route for user login
app.post('/user/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: true,
      message: 'Request body incomplete, both email and password are required',
    });
  }

  const loginResult = await loginUser(email, password);

  if (loginResult.error) {
    return res.status(loginResult.statusCode).json({
      error: loginResult.error,
      message: loginResult.message,
    });
  }

  return res.status(loginResult.statusCode).json({
    token: loginResult.token,
    token_type: loginResult.token_type,
    expires_in: loginResult.expires_in,
  });
});

app.get('/movies/data/:imdbID', async (req, res) => {
  const { imdbID } = req.params;

  if (!imdbID) {
    return res.status(400).json({
      error: true,
      message: 'Invalid query parameters. imdbID is required.',
    });
  }

  const movieDataResult = await getMovieData(imdbID);

  if (movieDataResult.error) {
    return res.status(movieDataResult.statusCode).json({
      error: movieDataResult.error,
      message: movieDataResult.message,
    });
  }

  return res.status(movieDataResult.statusCode).json(movieDataResult.data);
});

app.get('/movies/search', async (req, res) => {
  const { title, year, page } = req.query;
  if (!title) {
    return res.status(400).json({
      error: true,
      message: 'Title query parameter is required.',
    });
  }
  const searchResults = await searchMovies(title, year, page);
  if (searchResults.error) {
    return res.status(searchResults.statusCode).json({
      error: searchResults.error,
      message: searchResults.message,
    });
  }
  return res.status(searchResults.statusCode).json({
    data: searchResults.data,
    pagination: searchResults.pagination,
  });
});
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route. You are authenticated!' });
});

//posters 
app.post('/posters/add/:imdbId', authenticateToken, uploadPosterMiddleware, async (req, res) => {
  try {
    //console.log(req);
    const result = await uploadPosterToDatabase(req.params.imdbId, req.file);

    if (result.error) {
      return res.status(result.statusCode).json({ error: true, message: result.message });
    }

    return res.status(200).json({ error: false, message: 'Poster Uploaded Successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: true, message: 'Internal Server Error' });
  }
});

app.get('/posters/:imdbId', authenticateToken, async (req, res) => {
  try {
    const result = await downloadPosterFromDatabase(req.params.imdbId, req.file);

    if (result.error) {
      return res.status(result.statusCode).json({ error: true, message: result.message });
    }
    res.setHeader('Content-Type', 'image/png');
    res.send(result.data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: true, message: 'Internal Server Error at route' });
  }
});



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(process.env.DB_HOST, process.env.DB_USER, process.env.DB_PASSWORD, process.env.DB_NAME);
});


module.exports = app;







