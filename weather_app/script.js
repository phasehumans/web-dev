const apiKey = '56d42657439d52900f97a8559ca8883d'
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const weatherResult = document.getElementById("weatherResult");

searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) {
    getWeather(city);
  }
});

async function getWeather(city) {
  try {
    weatherResult.innerHTML = "Loading...";
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("City not found");
    const data = await res.json();
    displayWeather(data);
  } catch (error) {
    weatherResult.innerHTML = `<p>${error.message}</p>`;
  }
}

function displayWeather(data) {
  const { name, main, weather, sys } = data;
  weatherResult.innerHTML = `
    <h2>${name}, ${sys.country}</h2>
    <img src="https://openweathermap.org/img/wn/${weather[0].icon}@2x.png" alt="${weather[0].description}">
    <p><strong>${main.temp}°C</strong></p>
    <p>${weather[0].description}</p>
    <p>Humidity: ${main.humidity}%</p>
  `;
}
