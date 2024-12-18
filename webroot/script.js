let mapLoaded = false;
let initialData = {};

let guessLatLng;

let played = false;

const map = L.map('map').setView([0, 0], 1);
const markerGroup = L.layerGroup().addTo(map);

L.tileLayer('map/{z}/{x}/{y}png.tile', {
  maxZoom: 7,
  attributionControl: false,
}).addTo(map);

window.addEventListener('message', (ev) => {
  const { type, data } = ev.data;
  // Reserved type for messages sent via `context.ui.webView.postMessage`
  if (type === 'devvit-message') {
    const { message } = data;
    // Load initial data
    if (message.type === 'initialData') {
      const { username, snoovatarUrl, guess, actual, allGameGuesses } =
        message.data;
      initialData.username = username;
      initialData.snoovatarUrl = snoovatarUrl;
      initialData.guess = guess;
      initialData.actual = actual;
      initialData.allGameGuesses = allGameGuesses;

      if (guess) {
        guessLatLng = guess;
        played = true;
      }

      if (!mapLoaded) {
        loadAndRenderMap();
      }
    }

    if (message.type === 'submitGuess') {
      window.parent.postMessage(
        {
          type: 'submitGuess',
          data: { lat: guessLatLng.lat, lng: guessLatLng.lng },
        },
        '*'
      );
    }

    if (message.type === 'showResults') {
      played = true;
      renderResults(message.data);
    }
  }
});

window.parent.postMessage(
  {
    type: 'initialData',
  },
  '*'
);

let snoovatarIcon;

function loadAndRenderMap() {
  snoovatarIcon = L.icon({
    iconUrl: initialData.snoovatarUrl,
    iconSize: [50, 69],
    iconAnchor: [25, 69],
    popupAnchor: [0, -69],
  });

  map.on('click', (e) => {
    if (played) {
      return;
    }

    markerGroup.clearLayers();
    guessLatLng = e.latlng;
    L.marker(guessLatLng, { icon: snoovatarIcon }).addTo(markerGroup);
  });

  if (initialData.guess && initialData.actual) {
    L.marker(initialData.guess, { icon: snoovatarIcon }).addTo(markerGroup);
    renderResults({ guess: initialData.guess, actual: initialData.actual });
  }

  if (initialData.guess && initialData.allGameGuesses) {
    renderAllGuesses();
  }
}

function renderAllGuesses() {
  for (const otherPlayersGuess of Object.values(initialData.allGameGuesses)) {
    if (otherPlayersGuess.username === initialData.username) {
      continue;
    }

    const icon = L.icon({
      iconUrl: otherPlayersGuess.snoovatarUrl,
      iconSize: [50, 69],
      iconAnchor: [25, 69],
      popupAnchor: [0, -69],
    });

    const m = L.marker(otherPlayersGuess, { icon: icon }).addTo(markerGroup)
      .bindPopup(`<div>
        <div><b>u/${otherPlayersGuess.username}</b></div>
        <div><i>Points: ${otherPlayersGuess.points}</i></div>
        <div><i>Distance: ${otherPlayersGuess.distanceString}</i></div>
        </div>`);

    m.on('click', function () {
      m.openPopup();
    });
  }
}

function renderResults(results) {
  const { guess, actual } = results;

  // Actual location marker
  L.marker(actual).addTo(markerGroup);

  // Zoom to fit both markers
  const bounds = L.latLngBounds([guess, actual]).pad(0.3);
  map.fitBounds(bounds);

  // show distance as a line
  L.polyline([guess, actual], {
    color: '#ff4500',
    dashArray: '5, 10',
  }).addTo(markerGroup);
}
