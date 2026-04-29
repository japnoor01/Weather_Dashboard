const path = require("path");
const express = require("express");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Node 20+ has fetch built-in
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Serve static files
app.use(express.static("public"));

// Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    apiKeyStatus: process.env.API_KEY ? "OK" : "MISSING",
    timestamp: new Date().toISOString(),
  });
});

// Weather by city
app.get("/api/weather/:city", async (req, res) => {
  try {
    const { city } = req.params;
    const API_KEY = process.env.API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "API_KEY missing" });
    }

    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`;

    const [currentRes, forecastRes] = await Promise.all([
      fetch(currentUrl),
      fetch(forecastUrl),
    ]);

    const currentData = await currentRes.json();
    const forecastData = await forecastRes.json();

    res.json({
      currentWeather: currentData,
      forecast: forecastData,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Weather by location
app.get("/api/weather/geolocation/:lat/:lon", async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const API_KEY = process.env.API_KEY;

    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

    const [currentRes, forecastRes] = await Promise.all([
      fetch(currentUrl),
      fetch(forecastUrl),
    ]);

    const currentData = await currentRes.json();
    const forecastData = await forecastRes.json();

    res.json({
      currentWeather: currentData,
      forecast: forecastData,
      city: currentData.name,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});