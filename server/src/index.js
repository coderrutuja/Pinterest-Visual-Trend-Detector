const dotenv = require('dotenv');

// Load environment variables before loading the rest of the app,
// so modules that read process.env at require-time see the values.
dotenv.config();

const app = require('./app');
const { initDb } = require('./config/db');

const port = process.env.PORT || 5000;

async function start() {
  try {
    await initDb();
    app.listen(port, () => {
      console.log(`API server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
