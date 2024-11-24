const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./config/database');
require('dotenv').config();

const salesRoutes = require('./Router/sales_router');

const app = express();
connectDB();

app.use(bodyParser.json());
app.use('/sales',salesRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
