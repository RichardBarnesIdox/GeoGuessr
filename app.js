(function () {
  const LEADERBOARD_LIMIT = 10;
  const LEADERBOARD_PATH = "leaderboard";
  const LEADERBOARD_RETRY_LIMIT = 3;
  const ROUNDS_PER_GAME = 3;
  const rounds = [
    {
      name: "Angel of the North",
      lat: 54.91447,
      lng: -1.58862,
      osGridRef: "Where is this?  Click on map to place your guess!"
    },
    {
      name: "Abbey Road Studios",
      lat: 51.53218,
      lng: -0.17744,
      osGridRef: "Where is this?  Click on map to place your guess!"
    },
    {
      name: "Trafford Centre",
      lat: 53.46559,
      lng: -2.34256,
      osGridRef: "Where is this?  Click on map to place your guess!"
    },
    {
      name: "Magna Carta Memorial",
      lat: 51.44854,
      lng: -0.56736,
      osGridRef: "Where is this?  Click on map to place your guess!"
    },
    {
      name: "Greyfriars Bobby, Edinburgh",
      lat: 55.94688,
      lng: -3.19126,
      osGridRef: "Where is this?  Click on map to place your guess!"
    },
    {
      name: "Alton Towers",
      lat: 52.98680,
      lng: -1.88325,
      osGridRef: "Where is this?  Click on map to place your guess!"
    },
    { 
      name: "Dungerness Power Stations",
      lat: 50.91145,
      lng: 0.96295,
      osGridRef: "Where is this?  Click on map to place your guess!"
    },
    {
      name: "Derwent Reservoir",
      lat: 53.40577,
      lng: -1.73929,
      osGridRef: "Where is this?  Click on map to place your guess!"
    },
    {
      name: "Whitelee Wind Farm",
      lat: 55.71287,
      lng: -4.34919,
      osGridRef: "Where is this?  Click on map to place your guess!"
    }

    /*
    {
      name: "Idox Farnborough",
      lat: 51.2863,
      lng: -0.7601,
      osGridRef: "Where is this?  Click on map to place your guess!"
    },
    {
      name: "Idox Talgarth",
      lat: 51.99687,
      lng: -3.23325,
      osGridRef: "Where is this?  Click on map to place your guess!"
    },
    {
      name: "Idox Glasgow",
      lat: 55.86066,
      lng: -4.25759,
      osGridRef: "Where is this?  Click on map to place your guess!"
    }
    */
  ];

  const state = {
    currentRoundIndex: 0,
    gameRounds: [],
    totalScore: 0,
    results: [],
    leaderboardEntries: [],
    leaderboard: [],
    guessLatLng: null,
    map: null,
    guessMarker: null,
    actualMarker: null,
    resultLine: null,
    panorama: null,
    pendingLeaderboardScore: null,
    submittingLeaderboard: false
  };

  let googleMapsLoadPromise = null;

  const elements = {
    homeView: document.getElementById("home-view"),
    gameView: document.getElementById("game-view"),
    endView: document.getElementById("end-view"),
    startGameButton: document.getElementById("start-game-button"),
    playAgainButton: document.getElementById("play-again-button"),
    finishButton: document.getElementById("finish-button"),
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
    streetViewFallback: document.getElementById("street-view-fallback"),
    guessMap: document.getElementById("guess-map"),
    homeTitleText: document.getElementById("home-title-text"),
    leaderboardList: document.getElementById("leaderboard-list"),
    resetLeaderboardButton: document.getElementById("reset-leaderboard-button"),
    resetLeaderboardConfirmModal: document.getElementById("reset-leaderboard-confirm-modal"),
    resetLeaderboardConfirmNoButton: document.getElementById("reset-leaderboard-confirm-no"),
    resetLeaderboardConfirmYesButton: document.getElementById("reset-leaderboard-confirm-yes"),
    leaderboardModal: document.getElementById("leaderboard-modal"),
    leaderboardForm: document.getElementById("leaderboard-form"),
    leaderboardName: document.getElementById("leaderboard-name"),
    leaderboardCompany: document.getElementById("leaderboard-company"),
    leaderboardEmail: document.getElementById("leaderboard-email"),
    leaderboardFormMessage: document.getElementById("leaderboard-form-message"),
    leaderboardOptOutButton: document.getElementById("leaderboard-opt-out-button")
  };

  const DIAGNOSTIC_PREFIX = "[Mini GeoGuessr diagnostics]";

  function logDiagnostic(message, data) {
    if (data === undefined) {
      console.info(DIAGNOSTIC_PREFIX, message);
      return;
    }

    console.info(DIAGNOSTIC_PREFIX, message, data);
  }

  function warnDiagnostic(message, data) {
    console.warn(DIAGNOSTIC_PREFIX, message, data);
  }

  function getElementDiagnostics(element) {
    if (!element) {
      return { exists: false };
    }

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return {
      exists: true,
      id: element.id,
      className: element.className,
      ariaHidden: element.getAttribute("aria-hidden"),
      display: style.display,
      visibility: style.visibility,
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }

  function getViewDiagnostics() {
    return {
      home: getElementDiagnostics(elements.homeView),
      game: getElementDiagnostics(elements.gameView),
      end: getElementDiagnostics(elements.endView)
    };
  }

  function logMissingElementDiagnostics() {
    const missingElements = Object.entries(elements)
      .filter(function ([, element]) {
        return !element;
      })
      .map(function ([name]) {
        return name;
      });

    if (missingElements.length) {
      warnDiagnostic("Missing expected DOM elements", missingElements);
      return;
    }

    logDiagnostic("All expected DOM elements were found");
  }

  function attachGlobalDiagnostics() {
    window.addEventListener("error", function (event) {
      console.error(DIAGNOSTIC_PREFIX, "Window error", {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error
      });
    });

    window.addEventListener("unhandledrejection", function (event) {
      console.error(DIAGNOSTIC_PREFIX, "Unhandled promise rejection", event.reason);
    });
  }

  function runInitStep(name, step) {
    logDiagnostic(`Init step started: ${name}`);

    try {
      const result = step();
      logDiagnostic(`Init step completed: ${name}`);
      return result;
    } catch (error) {
      console.error(DIAGNOSTIC_PREFIX, `Init step failed: ${name}`, error);
      throw error;
    }
  }

  function getLeaderboardDatabaseUrl() {
    const config = window.APP_CONFIG || {};
    return typeof config.leaderboardDatabaseUrl === "string"
      ? config.leaderboardDatabaseUrl.replace(/\/+$/, "")
      : "";
  }

  function hasSharedLeaderboard() {
    const databaseUrl = getLeaderboardDatabaseUrl();

    return Boolean(databaseUrl) &&
      databaseUrl.indexOf("YOUR-PROJECT-ID") === -1 &&
      /^https:\/\/.+/i.test(databaseUrl);
  }

  function getLeaderboardRequestUrl() {
    return `${getLeaderboardDatabaseUrl()}/${LEADERBOARD_PATH}.json`;
  }

  function getLeaderboardEntryList(data) {
    if (Array.isArray(data)) {
      return data;
    }

    if (data && typeof data === "object") {
      return Object.values(data);
    }

    return [];
  }

  function sanitizeLeaderboardEntries(entries) {
    const entryList = getLeaderboardEntryList(entries);

    if (!entryList.length) {
      return [];
    }

    return entryList
      .filter(function (entry) {
        return entry &&
          typeof entry.name === "string" &&
          typeof entry.company === "string" &&
          Number.isFinite(entry.score);
      })
      .map(function (entry) {
        const deletedAt = typeof entry.deletedAt === "number" ? entry.deletedAt : null;

        return {
          name: entry.name.trim() || "Anonymous",
          company: entry.company.trim() || "Not provided",
          email: typeof entry.email === "string" ? entry.email.trim() : "",
          score: Math.max(0, Math.round(entry.score)),
          achievedAt: typeof entry.achievedAt === "number" ? entry.achievedAt : Date.now(),
          deleted: entry.deleted === true || deletedAt !== null,
          deletedAt: deletedAt
        };
      })
      .sort(compareLeaderboardEntries);
  }

  function isActiveLeaderboardEntry(entry) {
    return entry.deleted !== true && !Number.isFinite(entry.deletedAt);
  }

  function getVisibleLeaderboardEntries(entries) {
    return entries
      .filter(isActiveLeaderboardEntry)
      .sort(compareLeaderboardEntries)
      .slice(0, LEADERBOARD_LIMIT);
  }

  function setLeaderboardEntries(entries) {
    state.leaderboardEntries = sanitizeLeaderboardEntries(entries);
    state.leaderboard = getVisibleLeaderboardEntries(state.leaderboardEntries);
  }

  function compareLeaderboardEntries(a, b) {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return b.achievedAt - a.achievedAt;
  }

  function renderLeaderboard() {
    elements.leaderboardList.innerHTML = "";

    if (!state.leaderboard.length) {
      const emptyState = document.createElement("p");
      emptyState.className = "leaderboard-empty";
      emptyState.textContent = hasSharedLeaderboard()
        ? "No shared scores yet. Be the first on the board."
        : "Configure a shared leaderboard URL in config.js.";
      elements.leaderboardList.appendChild(emptyState);
      return;
    }

    state.leaderboard.forEach(function (entry, index) {
      const item = document.createElement("div");
      item.className = "leaderboard-item";

      const position = document.createElement("span");
      position.className = "leaderboard-rank";
      position.textContent = `#${index + 1}`;

      const details = document.createElement("div");
      details.className = "leaderboard-details";

      const name = document.createElement("strong");
      name.textContent = entry.name;

      const company = document.createElement("span");
      company.className = "leaderboard-company";
      company.textContent = entry.company;

      const score = document.createElement("span");
      score.className = "leaderboard-score";
      score.textContent = `${entry.score} pts`;

      details.appendChild(name);
      details.appendChild(company);
      item.appendChild(position);
      item.appendChild(details);
      item.appendChild(score);
      elements.leaderboardList.appendChild(item);
    });
  }

  function setLeaderboardFormMessage(message, isError) {
    elements.leaderboardFormMessage.textContent = message;
    elements.leaderboardFormMessage.classList.toggle("hidden", !message);
    elements.leaderboardFormMessage.classList.toggle("form-message-error", Boolean(message && isError));
  }

  function setLeaderboardFormDisabled(isDisabled) {
    state.submittingLeaderboard = isDisabled;
    elements.leaderboardName.disabled = isDisabled;
    elements.leaderboardCompany.disabled = isDisabled;
    elements.leaderboardEmail.disabled = isDisabled;
    elements.leaderboardOptOutButton.disabled = isDisabled;

    const submitButton = elements.leaderboardForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = isDisabled;
    }
  }

  async function fetchLeaderboardState() {
    if (!hasSharedLeaderboard()) {
      return { entries: [] };
    }

    const response = await fetch(getLeaderboardRequestUrl(), {
      method: "GET",
      headers: {
        "X-Firebase-ETag": "true"
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Shared leaderboard URL not found. Check leaderboardDatabaseUrl in config.js.");
      }

      throw new Error(`Leaderboard load failed with status ${response.status}.`);
    }

    const data = await response.json();
    const etag = response.headers.get("ETag");
    return {
      etag: etag,
      entries: sanitizeLeaderboardEntries(data)
    };
  }

  async function putLeaderboardEntries(entries, etag) {
    const headers = {
      "Content-Type": "application/json"
    };

    if (etag) {
      headers["if-match"] = etag;
    }

    const response = await fetch(getLeaderboardRequestUrl(), {
      method: "PUT",
      headers: headers,
      body: JSON.stringify(entries)
    });

    if (response.status === 412) {
      return false;
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Shared leaderboard URL not found. Check leaderboardDatabaseUrl in config.js.");
      }

      throw new Error(`Leaderboard save failed with status ${response.status}.`);
    }

    return true;
  }

  async function loadLeaderboard() {
    if (!hasSharedLeaderboard()) {
      setLeaderboardEntries([]);
      renderLeaderboard();
      return;
    }

    try {
      const leaderboardState = await fetchLeaderboardState();
      setLeaderboardEntries(leaderboardState.entries);
    } catch (error) {
      setLeaderboardEntries([]);
    }

    renderLeaderboard();
  }

  async function updateSharedLeaderboard(mutator) {
    if (!hasSharedLeaderboard()) {
      throw new Error("Shared leaderboard is not configured.");
    }

    for (let attempt = 0; attempt < LEADERBOARD_RETRY_LIMIT; attempt += 1) {
      const leaderboardState = await fetchLeaderboardState();
      const nextEntries = sanitizeLeaderboardEntries(mutator(leaderboardState.entries));
      const didSave = await putLeaderboardEntries(nextEntries, leaderboardState.etag);

      if (didSave) {
        setLeaderboardEntries(nextEntries);
        renderLeaderboard();
        return nextEntries;
      }
    }

    throw new Error("Shared leaderboard was updated by another player. Please try again.");
  }

  function isLeaderboardScore(score) {
    if (!hasSharedLeaderboard()) {
      return false;
    }

    if (state.leaderboard.length < LEADERBOARD_LIMIT) {
      return true;
    }

    const lowestScore = state.leaderboard[state.leaderboard.length - 1].score;
    return score >= lowestScore;
  }

  function openLeaderboardModal(score) {
    state.pendingLeaderboardScore = score;
    elements.leaderboardForm.reset();
    setLeaderboardFormMessage("", false);
    setLeaderboardFormDisabled(false);
    elements.leaderboardModal.classList.remove("hidden");
    elements.leaderboardName.focus();
  }

  function closeLeaderboardModal() {
    if (state.submittingLeaderboard) {
      return;
    }

    state.pendingLeaderboardScore = null;
    setLeaderboardFormMessage("", false);
    setLeaderboardFormDisabled(false);
    elements.leaderboardModal.classList.add("hidden");
  }

  function openResetLeaderboardConfirmModal() {
    elements.resetLeaderboardConfirmModal.classList.remove("hidden");
    elements.resetLeaderboardConfirmNoButton.focus();
  }

  function closeResetLeaderboardConfirmModal() {
    elements.resetLeaderboardConfirmModal.classList.add("hidden");
  }

  async function submitLeaderboardEntry(event) {
    event.preventDefault();

    if (state.pendingLeaderboardScore === null || state.submittingLeaderboard) {
      return;
    }

    const name = elements.leaderboardName.value.trim();
    const company = elements.leaderboardCompany.value.trim();
    const email = elements.leaderboardEmail.value.trim();

    if (!name || !company) {
      return;
    }

    setLeaderboardFormDisabled(true);
    setLeaderboardFormMessage("Saving to shared leaderboard...", false);

    try {
      await updateSharedLeaderboard(function (entries) {
        return entries.concat([{
          name: name,
          company: company,
          email: email,
          score: state.pendingLeaderboardScore,
          achievedAt: Date.now()
        }]);
      });

      state.pendingLeaderboardScore = null;
      setLeaderboardFormMessage("", false);
      elements.leaderboardModal.classList.add("hidden");
    } catch (error) {
      setLeaderboardFormMessage(error.message, true);
    } finally {
      setLeaderboardFormDisabled(false);
    }
  }

  async function resetLeaderboard() {
    if (!hasSharedLeaderboard()) {
      closeResetLeaderboardConfirmModal();
      return;
    }

    elements.resetLeaderboardButton.disabled = true;
    elements.resetLeaderboardConfirmNoButton.disabled = true;
    elements.resetLeaderboardConfirmYesButton.disabled = true;

    try {
      const resetAt = Date.now();

      await updateSharedLeaderboard(function (entries) {
        return entries.map(function (entry) {
          if (!isActiveLeaderboardEntry(entry)) {
            return entry;
          }

          return {
            ...entry,
            deleted: true,
            deletedAt: resetAt
          };
        });
      });
      closeResetLeaderboardConfirmModal();
    } catch (error) {
      window.alert("Unable to reset the shared leaderboard right now.");
    } finally {
      elements.resetLeaderboardButton.disabled = false;
      elements.resetLeaderboardConfirmNoButton.disabled = false;
      elements.resetLeaderboardConfirmYesButton.disabled = false;
    }
  }

  function formatLeaderboardTableCell(value) {
    const text = String(value ?? "").replace(/\r?\n/g, " ").trim();

    if (/[",]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  }

  function getLeaderboardExportTable(entries) {
    const rows = [["score", "name", "company", "email", "deleted"]];

    entries.forEach(function (entry) {
      rows.push([
        entry.score,
        entry.name,
        entry.company,
        entry.email,
        entry.deleted === true ? "true" : "false"
      ]);
    });

    return rows
      .map(function (row) {
        return row.map(formatLeaderboardTableCell).join(",");
      })
      .join("\n");
  }

  function writeTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(text);
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      const didCopy = document.execCommand("copy");

      if (!didCopy) {
        throw new Error("Clipboard copy failed.");
      }

      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  async function copyPersistedLeaderboardEntries() {
    if (!hasSharedLeaderboard()) {
      window.alert("Shared leaderboard is not configured.");
      return;
    }

    try {
      const leaderboardState = await fetchLeaderboardState();
      setLeaderboardEntries(leaderboardState.entries);
      renderLeaderboard();
      await writeTextToClipboard(getLeaderboardExportTable(leaderboardState.entries));
      window.alert("Leaderboard entries copied to the clipboard.");
    } catch (error) {
      window.alert("Unable to copy persisted leaderboard entries right now.");
    }
  }

  function switchView(viewName) {
    const views = {
      home: elements.homeView,
      game: elements.gameView,
      end: elements.endView
    };

    logDiagnostic("switchView called", {
      requestedView: viewName,
      before: getViewDiagnostics()
    });

    if (!views[viewName]) {
      warnDiagnostic("switchView received an unknown view name", {
        requestedView: viewName,
        availableViews: Object.keys(views)
      });
      return;
    }

    Object.entries(views).forEach(([name, element]) => {
      if (!element) {
        warnDiagnostic("switchView skipped a missing view element", { name: name });
        return;
      }

      const isActive = name === viewName;
      element.classList.toggle("view-active", isActive);
      element.setAttribute("aria-hidden", String(!isActive));
    });

    logDiagnostic("switchView completed", {
      requestedView: viewName,
      after: getViewDiagnostics()
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

  function getRandomGameRounds() {
    const shuffledRounds = rounds.slice();

    for (let index = shuffledRounds.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const round = shuffledRounds[index];
      shuffledRounds[index] = shuffledRounds[randomIndex];
      shuffledRounds[randomIndex] = round;
    }

    return shuffledRounds.slice(0, Math.min(ROUNDS_PER_GAME, shuffledRounds.length));
  }

  function initMap() {
    logDiagnostic("initMap called", {
      hasLeaflet: Boolean(window.L),
      guessMap: getElementDiagnostics(elements.guessMap)
    });

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

    logDiagnostic("initMap completed", {
      mapReady: Boolean(state.map),
      guessMap: getElementDiagnostics(elements.guessMap)
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
    logDiagnostic("loadRound called", {
      roundIndex: roundIndex,
      mapReady: Boolean(state.map),
      viewState: getViewDiagnostics()
    });

    clearRoundOverlays();
    resetMapView();

    const round = state.gameRounds[roundIndex];
    elements.roundTitle.textContent = `Round ${roundIndex + 1} of ${state.gameRounds.length}`;
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

    const round = state.gameRounds[state.currentRoundIndex];
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

    if (state.currentRoundIndex < state.gameRounds.length - 1) {
      elements.nextRoundButton.classList.remove("hidden");
    } else {
      elements.finalResultsButton.classList.remove("hidden");
    }
  }

  async function showEndScreen() {
    switchView("end");
    elements.finalScore.textContent = String(state.totalScore);
    elements.breakdownList.innerHTML = "";

    state.results.forEach(function (result, index) {
      const item = document.createElement("div");
      item.className = "breakdown-item";
      item.textContent = `Round ${index + 1} - ${result.roundName}: ${result.score} points, ${result.distanceKm.toFixed(1)} km away`;
      elements.breakdownList.appendChild(item);
    });

    await loadLeaderboard();

    if (isLeaderboardScore(state.totalScore)) {
      openLeaderboardModal(state.totalScore);
    }
  }

  function finishGame() {
    logDiagnostic("Finish button routed back to home screen", {
      viewState: getViewDiagnostics()
    });
    switchView("home");
    loadLeaderboard();
  }

  function nextRound() {
    if (state.currentRoundIndex >= state.gameRounds.length - 1) {
      showEndScreen();
      return;
    }

    state.currentRoundIndex += 1;
    loadRound(state.currentRoundIndex);
  }

  function resetGame() {
    logDiagnostic("resetGame started", {
      previousRoundIndex: state.currentRoundIndex,
      previousTotalScore: state.totalScore,
      previousResultsCount: state.results.length,
      hasGoogleMapsLoadPromise: Boolean(googleMapsLoadPromise),
      viewState: getViewDiagnostics()
    });

    state.currentRoundIndex = 0;
    state.gameRounds = getRandomGameRounds();
    state.totalScore = 0;
    state.results = [];
    elements.runningScore.textContent = "0";
    switchView("game");

    const mapsPromise = googleMapsLoadPromise || loadGoogleMapsScript();
    mapsPromise.then(function () {
      logDiagnostic("Google Maps load promise resolved for resetGame", {
        hasGoogleMapsApi: Boolean(window.google && window.google.maps)
      });
      loadRound(0);
    }).catch(function (error) {
      console.error(DIAGNOSTIC_PREFIX, "Google Maps load promise failed during resetGame", error);
    });
  }

  function loadGoogleMapsScript() {
    if (googleMapsLoadPromise) {
      logDiagnostic("loadGoogleMapsScript reused existing promise");
      return googleMapsLoadPromise;
    }

    logDiagnostic("loadGoogleMapsScript started", {
      hasGoogleMapsApi: Boolean(window.google && window.google.maps)
    });

    googleMapsLoadPromise = new Promise(function (resolve) {
      if (window.google && window.google.maps) {
        logDiagnostic("Google Maps API already available");
        resolve();
        return;
      }

      const config = window.APP_CONFIG || {};

      if (!config.googleMapsApiKey || config.googleMapsApiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
        warnDiagnostic("Google Maps API key is missing or still set to the placeholder", {
          googleMapsApiKey: config.googleMapsApiKey
        });
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${config.googleMapsApiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = function () {
        logDiagnostic("Google Maps API script loaded");
        resolve();
      };
      script.onerror = function () {
        warnDiagnostic("Google Maps API script failed to load", {
          src: script.src
        });
        resolve();
      };
      document.head.appendChild(script);
      logDiagnostic("Google Maps API script tag appended", {
        src: script.src
      });
    });

    return googleMapsLoadPromise;
  }

  function attachEvents() {
    logDiagnostic("attachEvents called", {
      startGameButton: getElementDiagnostics(elements.startGameButton),
      playAgainButton: getElementDiagnostics(elements.playAgainButton),
      finishButton: getElementDiagnostics(elements.finishButton)
    });

    elements.startGameButton.addEventListener("click", function (event) {
      logDiagnostic("Start Game button clicked", {
        defaultPrevented: event.defaultPrevented,
        buttonDiagnostics: getElementDiagnostics(elements.startGameButton),
        viewState: getViewDiagnostics()
      });
      resetGame();
    });

    elements.playAgainButton.addEventListener("click", function (event) {
      logDiagnostic("Play Again button clicked", {
        defaultPrevented: event.defaultPrevented,
        viewState: getViewDiagnostics()
      });
      resetGame();
    });

    elements.finishButton.addEventListener("click", function () {
      finishGame();
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

    elements.resetLeaderboardButton.addEventListener("click", function () {
      openResetLeaderboardConfirmModal();
    });

    elements.resetLeaderboardConfirmNoButton.addEventListener("click", function () {
      closeResetLeaderboardConfirmModal();
    });

    elements.resetLeaderboardConfirmYesButton.addEventListener("click", function () {
      resetLeaderboard();
    });

    elements.leaderboardForm.addEventListener("submit", function (event) {
      submitLeaderboardEntry(event);
    });

    elements.leaderboardOptOutButton.addEventListener("click", function () {
      closeLeaderboardModal();
    });

    elements.homeTitleText.addEventListener("click", function () {
      copyPersistedLeaderboardEntries();
    });
  }

  function init() {
    logDiagnostic("App init started", {
      location: window.location.href,
      initialViewState: getViewDiagnostics()
    });

    attachGlobalDiagnostics();
    logMissingElementDiagnostics();

    runInitStep("attachEvents", attachEvents);
    runInitStep("renderLeaderboard", renderLeaderboard);
    runInitStep("loadLeaderboard", loadLeaderboard);
    runInitStep("initMap", initMap);
    runInitStep("loadGoogleMapsScript", loadGoogleMapsScript);

    logDiagnostic("App init completed", {
      finalViewState: getViewDiagnostics(),
      hasLeaflet: Boolean(window.L),
      hasGoogleMapsApi: Boolean(window.google && window.google.maps)
    });
  }

  init();
})();
