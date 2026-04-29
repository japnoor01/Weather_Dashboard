const searchInputEl = document.querySelector('#search-input');
const searchFormEl = document.querySelector('#search-form');
const currentLocationBtnEl = document.querySelector('#current-location-btn');
const loaderEl = document.querySelector('#loader');
const errorContainerEl = document.querySelector('#error-container');

const cityNameEl = document.querySelector('#city-name-date');
const temperatureEl = document.querySelector('#temperature');
const humidityEl = document.querySelector('#humidity');
const windSpeedEl = document.querySelector('#wind-speed');
const forecastContainerEl = document.querySelector('#forecast-container');
const historyContainerEl = document.querySelector('#history-container');

// Use the same origin as the page so requests work when served by Express.
const API_BASE = '/api';
const FALLBACK_CITY = 'New Delhi';

function clearWeatherDisplay() {
  cityNameEl.textContent = '';
  temperatureEl.textContent = '';
  humidityEl.textContent = '';
  windSpeedEl.textContent = '';
  forecastContainerEl.innerHTML = '';
}

function showError(message) {
  errorContainerEl.textContent = message;
  errorContainerEl.classList.remove('hidden');
}

function hideError() {
  errorContainerEl.textContent = '';
  errorContainerEl.classList.add('hidden');
}

// Fetch weather by city name from backend
async function fetchWeather(city, options = {}) {
  const { keepErrorVisible = false } = options;

  try {
    if (!keepErrorVisible) {
      hideError();
    }

    clearWeatherDisplay();
    loaderEl.classList.remove('hidden');

    const { currentWeather, forecast } = await fetchJson(`${API_BASE}/weather/${encodeURIComponent(city)}`);
    displayCurrentWeather(currentWeather);
    displayForecast(forecast.list);
    saveCityToHistory(currentWeather.name);

  } catch (error) {
    console.error('Frontend Fetch Error:', error);
    showError(getErrorMessage(error));
  } finally {
    loaderEl.classList.add('hidden');
  }
}

async function fetchWeatherByCoords(lat, lon) {
  try {
    hideError();
    clearWeatherDisplay();
    loaderEl.classList.remove('hidden');

    const data = await fetchJson(`${API_BASE}/weather/geolocation/${lat}/${lon}`);

    displayCurrentWeather(data.currentWeather);
    displayForecast(data.forecast.list);
    saveCityToHistory(data.city || data.currentWeather.name);

  } catch (error) {
    console.error('Geolocation error:', error);
    showError(getGeolocationErrorMessage(error));
  } finally {
    loaderEl.classList.add('hidden');
  }
}

function loadCurrentLocationWeather() {
  if (!navigator.geolocation) {
    showError(`Geolocation is not supported in this browser. Showing ${FALLBACK_CITY} instead.`);
    fetchWeather(FALLBACK_CITY, { keepErrorVisible: true });
    return;
  }

  loaderEl.classList.remove('hidden');

  navigator.geolocation.getCurrentPosition(
    pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    error => {
      showError(`${getGeolocationErrorMessage(error)} Showing ${FALLBACK_CITY} instead.`);
      fetchWeather(FALLBACK_CITY, { keepErrorVisible: true });
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

function getErrorMessage(error) {
  if (error instanceof TypeError) {
    return 'Unable to reach the weather server. Start the app with "npm start" and open http://localhost:3000.';
  }

  return error.message || 'Something went wrong while loading weather data.';
}

function getGeolocationErrorMessage(error) {
  if (error && error.code === 1) {
    return 'Location access was blocked. Allow browser location permission to load weather for your current position.';
  }

  if (error && error.code === 2) {
    return 'Your location could not be determined.';
  }

  if (error && error.code === 3) {
    return 'Location request timed out.';
  }

  return getErrorMessage(error);
}

async function fetchJson(url) {
  const response = await fetch(url);
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error('The app is not receiving API JSON. Start the project with "npm start" and open http://localhost:3000 instead of using Live Server or opening the HTML file directly.');
  }

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || 'Weather data could not be loaded.');
  }

  return data;
}

function displayCurrentWeather(data) {
  const date = new Date().toLocaleDateString();
  cityNameEl.textContent = `${data.name}, ${data.sys.country} (${date})`;
  temperatureEl.textContent = `${Math.round(data.main.temp)} deg C`;
  humidityEl.textContent = `${data.main.humidity}%`;
  windSpeedEl.textContent = `${data.wind.speed} m/s`;
}

function displayForecast(forecastList) {
  forecastContainerEl.innerHTML = '';
  for (let i = 0; i < Math.min(40, forecastList.length); i += 8) {
    const forecast = forecastList[i];
    const card = document.createElement('div');
    card.className = 'forecast-card';
    const day = new Date(forecast.dt * 1000).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    card.innerHTML = `
      <p class="forecast-date">${day}</p>
      <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png" alt="${forecast.weather[0].description}">
      <p class="forecast-temp">${Math.round(forecast.main.temp)} deg C</p>
      <p class="forecast-meta">${forecast.weather[0].description}</p>
      <p class="forecast-meta">Humidity ${forecast.main.humidity}%</p>
    `;
    forecastContainerEl.appendChild(card);
  }
}

function saveCityToHistory(city) {
  let history = JSON.parse(localStorage.getItem('weatherHistory') || '[]');
  history = [city, ...history.filter(c => c.toLowerCase() !== city.toLowerCase())].slice(0, 10);
  localStorage.setItem('weatherHistory', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  historyContainerEl.innerHTML = '';
  JSON.parse(localStorage.getItem('weatherHistory') || '[]').forEach(city => {
    const btn = document.createElement('button');
    btn.className = 'history-btn';
    btn.textContent = city;
    btn.onclick = () => fetchWeather(city);
    historyContainerEl.appendChild(btn);
  });
}

// Initialize current-location weather and search interactions.
document.addEventListener('DOMContentLoaded', () => {
  renderHistory();
  loadCurrentLocationWeather();

  currentLocationBtnEl.addEventListener('click', loadCurrentLocationWeather);

  searchFormEl.onsubmit = e => {
    e.preventDefault();
    const city = searchInputEl.value.trim();
    if (!city) {
      return;
    }

    fetchWeather(city);
    searchInputEl.value = '';
  };
});
