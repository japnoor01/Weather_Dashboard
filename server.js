const path = require('path');
const express = require('express');
const app = express();

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server running");
});




// --- 1. IMPORT DEPENDENCIES ---
require('dotenv').config();
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// --- 2. CREATE EXPRESS APP INSTANCE ---
const app = express();

// Serve static files

app.use(express.static('public'));

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Serve index.html on root
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// --- 3. DEFINE THE PORT ---
const PORT = process.env.PORT || 3000;

// Debug env
console.log('ENV LOADED. API_KEY length:', process.env.API_KEY ? process.env.API_KEY.length : 'MISSING');

// --- API ROUTES ---
app.get('/api/weather/:city', async (req, res) => {
    try {
        const { city } = req.params;
        const API_KEY = process.env.API_KEY;
        
        console.log('FETCHING for', city, 'API_KEY len:', API_KEY ? API_KEY.length : 'MISSING');

        if (!API_KEY) {
            res.status(500).json({ error: 'Server: API_KEY missing from .env' });
            return;
        }

        const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;

        console.log('Weather URL:', currentWeatherUrl.substring(0, 80) + '...');

        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(currentWeatherUrl),
            fetch(forecastUrl)
        ]);

        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();

        if (currentData.cod !== 200) {
            throw new Error(currentData.message);
        }

        res.json({ currentWeather: currentData, forecast: forecastData });
    } catch (error) {
        console.error('API ERROR:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Geolocation endpoint
app.get('/api/weather/geolocation/:lat/:lon', async (req, res) => {
    try {
        const { lat, lon } = req.params;
        const API_KEY = process.env.API_KEY;

        if (!API_KEY) {
            res.status(500).json({ error: 'Server: API_KEY missing from .env' });
            return;
        }

        const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${API_KEY}&units=metric`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${API_KEY}&units=metric`;

        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(currentWeatherUrl),
            fetch(forecastUrl)
        ]);

        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();

        if (currentData.cod !== 200 && currentData.cod !== '200') {
            throw new Error(currentData.message || 'Unable to fetch weather for your location.');
        }

        if (forecastData.cod !== '200' && forecastData.cod !== 200) {
            throw new Error(forecastData.message || 'Unable to fetch forecast for your location.');
        }

        res.json({ currentWeather: currentData, forecast: forecastData, city: currentData.name });
    } catch (error) {
        console.error('GEO ERROR:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ apiKeyStatus: process.env.API_KEY ? 'OK' : 'MISSING', timestamp: new Date().toISOString() });
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server ready: http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
});
