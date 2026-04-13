(function () {
  const rounds = [
    {
      name: "Idox Farnborough",
      lat: 51.2863,
      lng: -0.7601,
      osGridRef: "Where is this?  Click on map to place your guess!"
    },
    {
      name: "Idox Talgarth",
      lat: 51.9961,
      lng: 3.2325,
      sGridRef: "Where is this?  Click on map to place your guess!"
    },
    {
      name: "Idox Glasgow",
      lat: 55.8617,
      lng: 4.2485,
      sGridRef: "Where is this?  Click on map to place your guess!"
    }
  ];

  const state = {
    currentRoundIndex: 0,
    totalScore: 0,
    results: [],
    guessLatLng: null,
    map: null,
    guessMarker: null,
    actualMarker: null,
    resultLine: null,
    panorama: null
  };

  let googleMapsLoadPromise = null;

  const elements = {
    homeView: document.getElementById("home-view"),
    gameView: document.getElementById("game-view"),
    endView: document.getElementById("end-view"),
    startGameButton: document.getElementById("start-game-button"),
    playAgainButton: document.getElementById("play-again-button"),
    confirmGuessButton: document.getElementById("confirm-guess-button"),
    nextRoundButton: document.getElementById("next-round-button"),
    finalResultsButton: document.getElementById("final-results-button"),
    roundTitle: document.getElementById("round-title"),
    roundSubtitle: document.getElementById("round-subtitle"),
    runningScore: document.getElementById("running-score"),
    roundResult: document.getElementById("round-result"),
    resultDistance: document.getElementById("result-distance"),
    resultScore: document.getElementById("result-score"),
    finalScore: document.getElementById("final-score"),
    breakdownList: document.getElementById("breakdown-list"),
    streetViewCanvas: document.getElementById("street-view"),
    streetViewFallback: document.getElementById("street-view-fallback")
  };

  function switchView(viewName) {
    const views = {
      home: elements.homeView,
      game: elements.gameView,
      end: elements.endView
    };

    Object.entries(views).forEach(([name, element]) => {
      const isActive = name === viewName;
      element.classList.toggle("view-active", isActive);
      element.setAttribute("aria-hidden", String(!isActive));
    });
  }

  function haversineDistanceKm(a, b) {
    const earthRadiusKm = 6371;
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);

    const haversine =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
  }

  function toRadians(value) {
    return value * (Math.PI / 180);
  }

  function calculateScore(distanceKm) {
    return Math.max(0, Math.round(5000 * Math.exp(-distanceKm / 200)));
  }

  function initMap() {
    state.map = L.map("guess-map", {
      center: [52.4862, -1.8904],
      zoom: 8,
      minZoom: 4
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(state.map);

    const ukBounds = L.latLngBounds(
      L.latLng(49.5, -8.8),
      L.latLng(59.5, 2.5)
    );
    state.map.setMaxBounds(ukBounds.pad(0.2));

    state.map.on("click", function (event) {
      if (elements.roundResult.classList.contains("hidden")) {
        placeGuess(event.latlng);
      }
    });
  }

  function placeGuess(latlng) {
    state.guessLatLng = { lat: latlng.lat, lng: latlng.lng };

    if (!state.guessMarker) {
      state.guessMarker = L.marker(latlng).addTo(state.map);
    } else {
      state.guessMarker.setLatLng(latlng);
    }

    elements.confirmGuessButton.classList.remove("hidden");
  }

  function clearRoundOverlays() {
    state.guessLatLng = null;
    elements.confirmGuessButton.classList.add("hidden");
    elements.roundResult.classList.add("hidden");
    elements.nextRoundButton.classList.add("hidden");
    elements.finalResultsButton.classList.add("hidden");
    elements.streetViewFallback.classList.add("hidden");

    if (state.guessMarker) {
      state.map.removeLayer(state.guessMarker);
      state.guessMarker = null;
    }

    if (state.actualMarker) {
      state.map.removeLayer(state.actualMarker);
      state.actualMarker = null;
    }

    if (state.resultLine) {
      state.map.removeLayer(state.resultLine);
      state.resultLine = null;
    }
  }

  function resetMapView() {
    state.map.setView([52.4862, -1.8904], 8);
  }

  function loadRound(roundIndex) {
    clearRoundOverlays();
    resetMapView();

    const round = rounds[roundIndex];
    elements.roundTitle.textContent = `Round ${roundIndex + 1} of ${rounds.length}`;
    elements.roundSubtitle.textContent = round.osGridRef
      ? round.osGridRef
      : "No grid reference provided";

    loadStreetView(round);

    setTimeout(function () {
      state.map.invalidateSize();
    }, 0);
  }

  function loadStreetView(round) {
    const fallback = elements.streetViewFallback;
    elements.streetViewCanvas.classList.remove("hidden");

    if (!window.google || !window.google.maps) {
      fallback.textContent = "Google Maps failed to load. Check your API key in config.js.";
      fallback.classList.remove("hidden");
      elements.streetViewCanvas.classList.add("hidden");
      return;
    }

    const service = new google.maps.StreetViewService();
    const location = { lat: round.lat, lng: round.lng };

    service.getPanorama({
      location: location,
      radius: 100
    }, function (data, status) {
      if (status !== google.maps.StreetViewStatus.OK || !data) {
        fallback.textContent = "Street View is unavailable for this round. You can still place a guess on the map.";
        fallback.classList.remove("hidden");
        elements.streetViewCanvas.classList.add("hidden");

        if (state.panorama) {
          state.panorama.setVisible(false);
        }

        return;
      }

      fallback.classList.add("hidden");
      elements.streetViewCanvas.classList.remove("hidden");

      if (!state.panorama) {
        state.panorama = new google.maps.StreetViewPanorama(
          elements.streetViewCanvas,
          {
            addressControl: false,
            linksControl: true,
            panControl: true,
            zoomControl: true,
            fullscreenControl: false,
            motionTracking: false
          }
        );
      }

      state.panorama.setPosition(data.location.latLng);
      state.panorama.setPov({ heading: 0, pitch: 0 });
      state.panorama.setVisible(true);
    });
  }

  function confirmGuess() {
    if (!state.guessLatLng) {
      return;
    }

    const round = rounds[state.currentRoundIndex];
    const actualLatLng = { lat: round.lat, lng: round.lng };
    const distanceKm = haversineDistanceKm(state.guessLatLng, actualLatLng);
    const score = calculateScore(distanceKm);

    state.actualMarker = L.marker([round.lat, round.lng]).addTo(state.map);
    state.resultLine = L.polyline(
      [
        [state.guessLatLng.lat, state.guessLatLng.lng],
        [round.lat, round.lng]
      ],
      { color: "#cc3d3d", weight: 3 }
    ).addTo(state.map);

    const bounds = L.latLngBounds([
      [state.guessLatLng.lat, state.guessLatLng.lng],
      [round.lat, round.lng]
    ]);
    state.map.fitBounds(bounds.pad(0.35));

    const result = {
      roundName: round.name,
      guessed: { ...state.guessLatLng },
      actual: actualLatLng,
      distanceKm: distanceKm,
      score: score
    };

    state.results.push(result);
    state.totalScore += score;
    elements.runningScore.textContent = String(state.totalScore);
    renderRoundResult(result);
  }

  function renderRoundResult(result) {
    elements.resultDistance.textContent = `Distance: ${result.distanceKm.toFixed(1)} km`;
    elements.resultScore.textContent = `Round score: ${result.score}`;
    elements.roundResult.classList.remove("hidden");
    elements.confirmGuessButton.classList.add("hidden");

    if (state.currentRoundIndex < rounds.length - 1) {
      elements.nextRoundButton.classList.remove("hidden");
    } else {
      elements.finalResultsButton.classList.remove("hidden");
    }
  }

  function showEndScreen() {
    switchView("end");
    elements.finalScore.textContent = String(state.totalScore);
    elements.breakdownList.innerHTML = "";

    state.results.forEach(function (result, index) {
      const item = document.createElement("div");
      item.className = "breakdown-item";
      item.textContent = `Round ${index + 1} - ${result.roundName}: ${result.score} points, ${result.distanceKm.toFixed(1)} km away`;
      elements.breakdownList.appendChild(item);
    });
  }

  function nextRound() {
    if (state.currentRoundIndex >= rounds.length - 1) {
      showEndScreen();
      return;
    }

    state.currentRoundIndex += 1;
    loadRound(state.currentRoundIndex);
  }

  function resetGame() {
    state.currentRoundIndex = 0;
    state.totalScore = 0;
    state.results = [];
    elements.runningScore.textContent = "0";
    switchView("game");
    googleMapsLoadPromise.then(function () {
      loadRound(0);
    });
  }

  function loadGoogleMapsScript() {
    if (googleMapsLoadPromise) {
      return googleMapsLoadPromise;
    }

    googleMapsLoadPromise = new Promise(function (resolve) {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      const config = window.APP_CONFIG || {};

      if (!config.googleMapsApiKey || config.googleMapsApiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${config.googleMapsApiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });

    return googleMapsLoadPromise;
  }

  function attachEvents() {
    elements.startGameButton.addEventListener("click", function () {
      resetGame();
    });

    elements.playAgainButton.addEventListener("click", function () {
      resetGame();
    });

    elements.confirmGuessButton.addEventListener("click", function () {
      confirmGuess();
    });

    elements.nextRoundButton.addEventListener("click", function () {
      nextRound();
    });

    elements.finalResultsButton.addEventListener("click", function () {
      showEndScreen();
    });
  }

  function init() {
    initMap();
    attachEvents();
    loadGoogleMapsScript();
  }

  init();
})();
