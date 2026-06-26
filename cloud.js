// ==================================================
// Quest Compass Supabase Cloud Adapter
// ==================================================
//
// The app remains local-first, but this adapter can read shared/public quest
// data from Supabase when the browser has network access.

const QUEST_CLOUD_CONFIG = {
    url: "https://livyedmscrkbnoxfpsoy.supabase.co",
    publishableKey: "sb_publishable_2ybz6mA59wsfU7e0pSS6Zw_nEL7Ol8n"
};

window.QuestCloud = (function() {
    let client = null;

    function getClient() {
        if (client) {
            return client;
        }

        if (!window.supabase || typeof window.supabase.createClient !== "function") {
            return null;
        }

        client = window.supabase.createClient(
            QUEST_CLOUD_CONFIG.url,
            QUEST_CLOUD_CONFIG.publishableKey
        );

        return client;
    }

    function isAvailable() {
        return getClient() !== null;
    }

    async function fetchPublicLocations(latitude, longitude, radiusMeters) {
        const supabase = getClient();

        if (!supabase) {
            return [];
        }

        let query = supabase
            .from("locations")
            .select(
                "id,name,description,hint,clue,visibility,latitude,longitude,accuracy_m,location_photo_url,icon_url,created_at,updated_at,glyph_objectives(id,label,shape,color_family,required,points,evidence_requirement,min_confidence,icon_url)"
            )
            .eq("visibility", "public")
            .limit(50);

        const response = await query;

        if (response.error) {
            throw response.error;
        }

        const mapped = (response.data || []).map(mapRemoteLocation);

        if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
            return mapped
                .map(function(location) {
                    location.distanceMeters = calculateDistanceMeters(
                        Number(latitude),
                        Number(longitude),
                        Number(location.latitude),
                        Number(location.longitude)
                    );
                    return location;
                })
                .filter(function(location) {
                    return location.distanceMeters <= Number(radiusMeters || 5000);
                })
                .sort(function(left, right) {
                    return left.distanceMeters - right.distanceMeters;
                });
        }

        return mapped;
    }

    async function submitPublicLocation(location) {
        const supabase = getClient();
        const payload = {
            location_name: location.name,
            location_hint: location.hint || "",
            location_clue: location.clue || "",
            location_latitude: Number(location.latitude),
            location_longitude: Number(location.longitude),
            location_accuracy_m: Number(location.accuracy || 0),
            location_photo_url: location.imageDataUrl && location.imageDataUrl.indexOf("data:") !== 0 ? location.imageDataUrl : null,
            glyphs: (location.glyphObjectives || []).map(function(objective) {
                return {
                    label: objective.label,
                    shape: objective.shape,
                    colorFamily: objective.colorFamily,
                    required: objective.required,
                    points: objective.points,
                    evidenceRequirement: objective.evidenceRequirement,
                    minConfidence: objective.minConfidence
                };
            })
        };

        if (!supabase) {
            return {
                ok: false,
                message: "Explorer Network client unavailable.",
                debug: {
                    hasUrl: Boolean(QUEST_CLOUD_CONFIG.url),
                    hasPublishableKey: Boolean(QUEST_CLOUD_CONFIG.publishableKey)
                }
            };
        }

        let response;

        try {
            response = await supabase.rpc("submit_public_location", payload);
        } catch (error) {
            return {
                ok: false,
                message: error.message || String(error),
                debug: {
                    hasUrl: Boolean(QUEST_CLOUD_CONFIG.url),
                    hasPublishableKey: Boolean(QUEST_CLOUD_CONFIG.publishableKey),
                    payload: payload,
                    networkFailure: error.message || String(error)
                }
            };
        }

        if (response.error) {
            return {
                ok: false,
                message: response.error.message,
                debug: {
                    hasUrl: Boolean(QUEST_CLOUD_CONFIG.url),
                    hasPublishableKey: Boolean(QUEST_CLOUD_CONFIG.publishableKey),
                    payload: payload,
                    responseError: response.error
                }
            };
        }

        return {
            ok: true,
            cloudId: response.data
        };
    }

    function mapRemoteLocation(row) {
        return {
            id: "cloud-" + row.id,
            cloudId: row.id,
            name: row.name || "Unnamed Cloud Location",
            hint: row.hint || row.description || "",
            clue: row.clue || row.hint || "",
            clueType: "text",
            clueAnswer: "",
            rewardText: "",
            rewardType: "story-fragment",
            rewardRarity: "Common",
            questName: "Public Quest",
            chainNextLocationId: "",
            visibility: row.visibility || "public",
            imageDataUrl: row.location_photo_url || row.icon_url || "",
            gpsSamples: [],
            glyphObjectives: (row.glyph_objectives || []).map(function(objective) {
                return {
                    id: "cloud-" + objective.id,
                    cloudId: objective.id,
                    label: objective.label || objective.color_family + " " + objective.shape,
                    shape: objective.shape,
                    colorFamily: objective.color_family,
                    iconDataUrl: objective.icon_url || "",
                    required: objective.required !== false,
                    points: Number(objective.points || 1),
                    evidenceRequirement: objective.evidence_requirement || "photo",
                    minConfidence: Number(objective.min_confidence || 75),
                    status: "pending",
                    completedAt: null,
                    completedBy: null,
                    sightings: []
                };
            }),
            completionBonus: 0,
            completedAt: null,
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
            accuracy: Number(row.accuracy_m || 0),
            category: "cloud",
            icon: "",
            creatorUsername: "cloud",
            status: "created",
            capturedCount: 0,
            visitedBy: [],
            facingDegrees: null,
            sigil: null,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || row.created_at || new Date().toISOString()
        };
    }

    return {
        isAvailable: isAvailable,
        fetchPublicLocations: fetchPublicLocations,
        submitPublicLocation: submitPublicLocation
    };
})();
