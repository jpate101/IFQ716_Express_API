const path = require('path');
const bcrypt = require('bcrypt');
const knexConfig = require(path.join(__dirname, '..', 'knexfile')).development;

const knex = require('knex')(knexConfig);

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const secretKey = process.env.JWT_SECRET || 'default-secret-key';
//const secretKey =  'default-secret-key';

async function registerUser(email, password) {
  try {
    // Check if the user already exists
    const existingUser = await knex('users').where('email', email).first();

    if (existingUser) {
      return { error: true, statusCode: 409, message: 'User already exists' };
    }

    // Hash the password before storing it in the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    await knex('users').insert({
      email,
      hash: hashedPassword,
    });

    return { error: false, message: 'User created' };
  } catch (error) {
    console.error(error);
    return { error: true, statusCode: 500, message: 'Internal Server Error' };
  }
}

async function loginUser(email, password) {
  try {
    // Check if the user exists
    const user = await knex('users').where('email', email).first();

    if (!user) {
      return { error: true, statusCode: 401, message: 'Incorrect email or password' };
    }

    // Compare the provided password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.hash);

    if (!passwordMatch) {
      return { error: true, statusCode: 401, message: 'Incorrect email or password' };
    }

    // If the password is correct, generate a JWT token
    const token = jwt.sign({ email: user.email }, secretKey, { expiresIn: '24h' });

    return { error: false, statusCode: 200, token, token_type: 'Bearer', expires_in: 86400 };
  } catch (error) {
    console.error(error);
    return { error: true, statusCode: 500, message: 'Internal Server Error' };
  }
}


function authenticateToken(req, res, next) {
  try {
    const tokenHeader = req.header('Authorization');

    if (!tokenHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract the token from the Authorization header
    //const token = tokenHeader.replace("Bearer ", "").trim();
    const token = tokenHeader.substring(7).trim();

    jwt.verify(token, secretKey, (err, user) => {
      if (err) {
        console.error('Token verification error:', err);
        return res.status(403).json({ error: 'Forbidden' });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Error in authenticateToken middleware:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { registerUser, loginUser, authenticateToken };