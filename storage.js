// ==================================================
// Quest Compass Storage System
// ==================================================

const STORAGE_KEY = "questCompass.savedPlaces.v1";
const LEGACY_STORAGE_KEY = "questCompassLocations";
const ACCOUNTS_KEY = "questCompass.accounts.v1";
const SESSION_KEY = "questCompass.session.v1";
const SETTINGS_KEY = "questCompass.settings.v1";
const QUEST_STATS_KEY = "questCompass.questStats.v1";

const DEFAULT_SETTINGS = {
    highAccuracyGps: true,
    autoStartScanner: false,
    soundCues: false,
    hapticCues: true,
    showTechnicalDetails: false,
    hideExactCoordinates: true,
    scannerSensitivity: "balanced",
    attuneThreshold: 75,
    attuneSignalSeconds: 3,
    attuneHoldSeconds: 3,
    showLandingOnOpen: true,
    rewardResource1: 1,
    rewardResource2: 0,
    themeDensity: "comfortable"
};

function createLocationId() {
    return "loc-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

function createAccount(username, password, resources) {
    return {
        username: username,
        password: password,
        resources: Object.assign(
            {
                resource1: 0,
                resource2: 0,
                resource3: 0,
                resource4: 0
            },
            resources || {}
        ),
        points: 0,
        secretsSolved: 0,
        artifacts: [],
        collection: [],
        createdLocationIds: [],
        unlockedLocationIds: [],
        visitHistory: [],
        captureHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

function normalizeAccount(account) {
    const normalized = createAccount(
        account.username || "",
        account.password || "",
        account.resources || {}
    );

    return Object.assign(
        normalized,
        account,
        {
            resources: Object.assign(normalized.resources, account.resources || {}),
            points: Number(account.points || 0),
            secretsSolved: Number(account.secretsSolved || 0),
            artifacts: Array.isArray(account.artifacts) ? account.artifacts : [],
            collection: Array.isArray(account.collection) ? account.collection : [],
            createdLocationIds: Array.isArray(account.createdLocationIds) ? account.createdLocationIds : [],
            unlockedLocationIds: Array.isArray(account.unlockedLocationIds) ? account.unlockedLocationIds : [],
            visitHistory: Array.isArray(account.visitHistory) ? account.visitHistory : [],
            captureHistory: Array.isArray(account.captureHistory) ? account.captureHistory : []
        }
    );
}

function loadAccounts() {
    const saved = localStorage.getItem(ACCOUNTS_KEY);
    let accounts = [];

    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            accounts = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            accounts = [];
        }
    }

    const felixAccount = accounts.find(function(account) {
        return account.username === "felix";
    });

    if (!felixAccount) {
        accounts.push(
            createAccount(
                "felix",
                "travis",
                {
                    resource1: 1000,
                    resource2: 100,
                    resource3: 1,
                    resource4: 1
                }
            )
        );

        saveAccounts(accounts);
    } else {
        felixAccount.password = "travis";
        felixAccount.resources = Object.assign(
            {},
            felixAccount.resources || {},
            {
                resource1: 1000,
                resource2: 100,
                resource3: 1,
                resource4: 1
            }
        );
        felixAccount.updatedAt = new Date().toISOString();
        saveAccounts(accounts);
    }

    return accounts.map(normalizeAccount);
}

function saveAccounts(accounts) {
    localStorage.setItem(
        ACCOUNTS_KEY,
        JSON.stringify(accounts.map(normalizeAccount))
    );
}

function getCurrentUsername() {
    const saved = localStorage.getItem(SESSION_KEY);

    if (!saved) {
        return null;
    }

    try {
        const parsed = JSON.parse(saved);
        return parsed.username || null;
    } catch (error) {
        return null;
    }
}

function setCurrentUsername(username) {
    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
            username: username,
            signedInAt: new Date().toISOString()
        })
    );
}

function getCurrentUser() {
    const username = getCurrentUsername();

    if (!username) {
        return null;
    }

    return loadAccounts().find(function(account) {
        return account.username === username;
    }) || null;
}

function saveCurrentUser(updatedUser) {
    const accounts = loadAccounts().map(function(account) {
        return account.username === updatedUser.username ? normalizeAccount(updatedUser) : account;
    });

    saveAccounts(accounts);
}

function loginOrCreateAccount(username, password) {
    const safeUsername = String(username || "").trim();
    const safePassword = String(password || "");

    if (safeUsername.length < 1 || safeUsername.length > 13) {
        return {
            ok: false,
            message: "Username must be 1 to 13 characters."
        };
    }

    const accounts = loadAccounts();
    const existing = accounts.find(function(account) {
        return account.username.toLowerCase() === safeUsername.toLowerCase();
    });

    if (existing) {
        if (existing.password !== safePassword) {
            return {
                ok: false,
                message: "That username already exists with a different password."
            };
        }

        setCurrentUsername(existing.username);

        return {
            ok: true,
            user: existing,
            message: "Welcome back."
        };
    }

    const newAccount = createAccount(safeUsername, safePassword);

    accounts.push(newAccount);
    saveAccounts(accounts);
    setCurrentUsername(newAccount.username);

    return {
        ok: true,
        user: newAccount,
        message: "Account created."
    };
}

function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);

    if (!saved) {
        return Object.assign({}, DEFAULT_SETTINGS);
    }

    try {
        return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(saved));
    } catch (error) {
        return Object.assign({}, DEFAULT_SETTINGS);
    }
}

function saveSettings(settings) {
    localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(Object.assign({}, DEFAULT_SETTINGS, settings))
    );
}

function getLocationStorageKey() {
    const username = getCurrentUsername();

    if (!username) {
        return STORAGE_KEY + ".guest";
    }

    return STORAGE_KEY + "." + username.toLowerCase();
}

function normalizeLocation(location) {
    const facingDegrees = location.facingDegrees ?? location.headingDegrees ?? null;

    return {
        id: location.id || createLocationId(),
        name: location.name || "Unnamed Place",
        hint: location.hint || "",
        clue: location.clue || location.hint || "",
        clueType: location.clueType || "text",
        clueAnswer: location.clueAnswer || "",
        rewardText: location.rewardText || "",
        rewardType: location.rewardType || "story-fragment",
        rewardRarity: location.rewardRarity || "Common",
        questName: location.questName || "Field Quest",
        chainNextLocationId: location.chainNextLocationId || "",
        imageDataUrl: location.imageDataUrl || "",
        gpsSamples: Array.isArray(location.gpsSamples) ? location.gpsSamples : [],
        latitude: Number(location.latitude ?? location.lat),
        longitude: Number(location.longitude ?? location.lng),
        accuracy: Number(location.accuracy ?? location.accuracyMeters ?? 0),
        category: location.category || "landmark",
        icon: location.icon || "",
        creatorUsername: location.creatorUsername || getCurrentUsername() || "guest",
        status: location.status || "created",
        capturedCount: Number(location.capturedCount || 0),
        visitedBy: Array.isArray(location.visitedBy) ? location.visitedBy : [],
        facingDegrees: facingDegrees === null || facingDegrees === undefined || Number.isNaN(Number(facingDegrees)) ?
            null :
            Number(facingDegrees),
        sigil: location.sigil || null,
        createdAt: location.createdAt || new Date().toISOString(),
        updatedAt: location.updatedAt || location.createdAt || new Date().toISOString()
    };
}

function loadLocations() {
    const savedForCurrentUser = localStorage.getItem(getLocationStorageKey());
    const saved = savedForCurrentUser ||
        (getCurrentUsername() ? null : localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY));

    if (!saved) {
        return [];
    }

    try {
        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.map(normalizeLocation);
    } catch (error) {
        return [];
    }
}

function saveLocations(locations) {
    localStorage.setItem(
        getLocationStorageKey(),
        JSON.stringify(locations.map(normalizeLocation))
    );

    localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function addLocation(location) {
    const locations = loadLocations();
    const normalized = normalizeLocation(location);

    locations.push(normalized);
    saveLocations(locations);

    const currentUser = getCurrentUser();

    if (currentUser && !currentUser.createdLocationIds.includes(normalized.id)) {
        currentUser.createdLocationIds.push(normalized.id);
        currentUser.updatedAt = new Date().toISOString();
        saveCurrentUser(currentUser);
    }
}

function updateLocationById(locationId, updater) {
    let updatedLocation = null;
    const locations = loadLocations().map(function(location) {
        if (location.id !== locationId) {
            return location;
        }

        const nextLocation = normalizeLocation(
            typeof updater === "function" ? updater(location) : Object.assign({}, location, updater || {})
        );

        nextLocation.updatedAt = new Date().toISOString();
        updatedLocation = nextLocation;
        return nextLocation;
    });

    saveLocations(locations);
    return updatedLocation;
}

function refineLocationPosition(locationId, latitude, longitude, accuracy) {
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
        return null;
    }

    return updateLocationById(locationId, function(location) {
        const refined = normalizeLocation(location);
        const sample = {
            latitude: Number(latitude),
            longitude: Number(longitude),
            accuracy: Number(accuracy || 0),
            username: getCurrentUsername() || "guest",
            capturedAt: new Date().toISOString()
        };
        const previousSamples = refined.gpsSamples.length || 1;

        refined.latitude = ((Number(refined.latitude) * previousSamples) + sample.latitude) / (previousSamples + 1);
        refined.longitude = ((Number(refined.longitude) * previousSamples) + sample.longitude) / (previousSamples + 1);
        refined.accuracy = Math.min(Number(refined.accuracy || sample.accuracy || 0), Number(sample.accuracy || refined.accuracy || 0));
        refined.gpsSamples.push(sample);

        return refined;
    });
}

function deleteLocationById(locationId) {
    const locations = loadLocations().filter(function(location) {
        return location.id !== locationId;
    });

    saveLocations(locations);
}

function clearLocations() {
    localStorage.removeItem(getLocationStorageKey());
}

function loadQuestStats() {
    const saved = localStorage.getItem(QUEST_STATS_KEY);

    if (!saved) {
        return {};
    }

    try {
        const parsed = JSON.parse(saved);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
        return {};
    }
}

function saveQuestStats(stats) {
    localStorage.setItem(QUEST_STATS_KEY, JSON.stringify(stats));
}

function recordLocationVisit(location, type) {
    const currentUser = getCurrentUser();

    if (!currentUser || !location) {
        return;
    }

    const visitedAt = new Date().toISOString();

    currentUser.visitHistory.push({
        locationId: location.id,
        locationName: location.name,
        type: type || "visit",
        visitedAt: visitedAt
    });

    if (!currentUser.unlockedLocationIds.includes(location.id)) {
        currentUser.unlockedLocationIds.push(location.id);
    }

    currentUser.updatedAt = visitedAt;
    saveCurrentUser(currentUser);

    const stats = loadQuestStats();
    const stat = stats[location.id] || createQuestStat(location);

    stat.locationName = location.name;
    stat.questName = location.questName || stat.questName;
    stat.visits += 1;
    stat.lastVisitedAt = visitedAt;

    stats[location.id] = stat;
    saveQuestStats(stats);
}

function recordLocationCapture(location) {
    const currentUser = getCurrentUser();

    if (!currentUser || !location) {
        return null;
    }

    const capturedAt = new Date().toISOString();
    const settings = loadSettings();

    currentUser.points += 1;
    currentUser.resources.resource1 += Number(settings.rewardResource1 || 0);
    currentUser.resources.resource2 += Number(settings.rewardResource2 || 0);
    currentUser.artifacts.push({
        id: "artifact-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
        locationId: location.id,
        locationName: location.name,
        name: location.rewardText || location.name,
        type: location.rewardType || "story-fragment",
        rarity: location.rewardRarity || "Common",
        discoveredAt: capturedAt
    });
    currentUser.collection = currentUser.artifacts;
    if (location.clue || location.clueAnswer) {
        currentUser.secretsSolved += 1;
    }
    currentUser.captureHistory.push({
        locationId: location.id,
        locationName: location.name,
        rewardType: location.rewardType || "story-fragment",
        rewardRarity: location.rewardRarity || "Common",
        capturedAt: capturedAt
    });

    if (!currentUser.unlockedLocationIds.includes(location.id)) {
        currentUser.unlockedLocationIds.push(location.id);
    }

    currentUser.updatedAt = capturedAt;
    saveCurrentUser(currentUser);

    const locations = loadLocations().map(function(savedLocation) {
        if (savedLocation.id !== location.id) {
            return savedLocation;
        }

        const capturedLocation = normalizeLocation(savedLocation);

        capturedLocation.status = "unlocked";
        capturedLocation.capturedCount += 1;
        capturedLocation.visitedBy = capturedLocation.visitedBy.filter(function(visit) {
            return visit.username !== currentUser.username;
        });
        capturedLocation.visitedBy.push({
            username: currentUser.username,
            visitedAt: capturedAt
        });
        capturedLocation.updatedAt = capturedAt;

        return capturedLocation;
    });

    saveLocations(locations);

    const stats = loadQuestStats();
    const stat = stats[location.id] || createQuestStat(location);

    stat.locationName = location.name;
    stat.questName = location.questName || stat.questName;
    stat.captures += 1;
    stat.points += 1;
    stat.lastCapturedAt = capturedAt;

    stats[location.id] = stat;
    saveQuestStats(stats);

    return {
        user: currentUser,
        stats: stat
    };
}

function createQuestStat(location) {
    return {
        locationId: location.id,
        locationName: location.name,
        questName: location.questName || "Field Quest",
        visits: 0,
        captures: 0,
        points: 0,
        lastVisitedAt: null,
        lastCapturedAt: null
    };
}

function getPopularQuestStats() {
    return Object.values(loadQuestStats()).sort(function(left, right) {
        return right.points - left.points || right.captures - left.captures || right.visits - left.visits;
    });
}

function resetLandingPreference() {
    const settings = loadSettings();

    settings.showLandingOnOpen = true;
    saveSettings(settings);
}
