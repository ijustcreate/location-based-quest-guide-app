// ==================================================
// Quest Compass Camera Glyph Detector
// ==================================================
//
// Local-only canvas scanner for thick hand-drawn marker-outline glyphs.
// It detects color + shape, then returns a canonical glyphId such as
// red_triangle, yellow_circle, or black_square.

let cameraStream = null;
let cameraDetectionTimer = null;
let stableMarkerFrames = 0;
let stableGlyphId = null;
let lastBestBox = null;
let stableHoldStartedAt = null;
let smoothedResult = {
    colorSignal: 0,
    symbolMatch: 0,
    lightQuality: 0,
    frameStability: 0,
    lockConfidence: 0
};

const COLOR_CODE_TO_GLYPH = {
    1: "red",
    2: "yellow",
    3: "blue",
    4: "green",
    5: "black"
};

const GLYPH_SCAN_CONFIG = {
    scanWidth: 260,
    minComponentPixels: 18,
    minSizeRatio: 0.002,
    maxSizeRatio: 0.34,
    tentativeConfidence: 70,
    attuneConfidence: 85,
    strongConfidence: 93,
    stableFramesNeeded: 8,
    holdMs: 650
};

function startCameraMarkerDetection(videoElement, canvasElement, onResult) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onResult(createScannerResult({
            title: "Camera unavailable",
            message: "This browser does not support camera access.",
            status: "error"
        }));
        return;
    }

    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: {
                ideal: "environment"
            }
        },
        audio: false
    }).then(function(stream) {
        cameraStream = stream;
        videoElement.srcObject = stream;
        videoElement.style.display = "none";
        canvasElement.style.display = "block";
        videoElement.play();

        onResult(createScannerResult({
            title: "Searching for Sigil",
            message: "Point your camera at a quest glyph.",
            status: "searching"
        }));

        if (cameraDetectionTimer) {
            clearInterval(cameraDetectionTimer);
        }

        cameraDetectionTimer = setInterval(function() {
            scanFrameForGlyph(videoElement, canvasElement, onResult);
        }, 180);
    }).catch(function(error) {
        onResult(createScannerResult({
            title: "Camera error",
            message: error.message,
            status: "error"
        }));
    });
}

function stopCameraMarkerDetection(videoElement, canvasElement) {
    if (cameraDetectionTimer) {
        clearInterval(cameraDetectionTimer);
        cameraDetectionTimer = null;
    }

    if (cameraStream) {
        cameraStream.getTracks().forEach(function(track) {
            track.stop();
        });
        cameraStream = null;
    }

    if (videoElement) {
        videoElement.pause();
        videoElement.srcObject = null;
        videoElement.style.display = "none";
    }

    if (canvasElement) {
        canvasElement.style.display = "none";
    }

    stableMarkerFrames = 0;
    stableGlyphId = null;
    lastBestBox = null;
    stableHoldStartedAt = null;
}

function scanFrameForGlyph(videoElement, canvasElement, onResult) {
    if (!videoElement.videoWidth || !videoElement.videoHeight) {
        return;
    }

    const context = canvasElement.getContext("2d");
    const scanWidth = GLYPH_SCAN_CONFIG.scanWidth;
    const scanHeight = Math.round(videoElement.videoHeight / videoElement.videoWidth * scanWidth);

    canvasElement.width = scanWidth;
    canvasElement.height = scanHeight;
    context.drawImage(videoElement, 0, 0, scanWidth, scanHeight);

    const frame = context.getImageData(0, 0, scanWidth, scanHeight);
    const lighting = estimateSceneLighting(frame.data);
    const mask = buildGlyphMask(frame.data, scanWidth, scanHeight, lighting);
    const candidates = findGlyphComponents(mask, scanWidth, scanHeight);
    const best = scoreBestCandidate(candidates, mask, scanWidth, scanHeight);

    context.drawImage(videoElement, 0, 0, scanWidth, scanHeight);
    drawScannerAtmosphere(context, scanWidth, scanHeight);

    if (!best || best.overallConfidence < GLYPH_SCAN_CONFIG.tentativeConfidence) {
        stableMarkerFrames = 0;
        stableGlyphId = null;
        lastBestBox = null;
        stableHoldStartedAt = null;

        onResult(smoothScannerResult(createScannerResult({
            title: "Searching for Sigil",
            message: "Hold a marker outline on white paper in the center.",
            status: "searching",
            lightQuality: lighting.quality
        })));
        return;
    }

    updateStability(best.glyphId, best.box, best.overallConfidence);

    const stabilityConfidence = Math.min(
        100,
        Math.round(stableMarkerFrames / GLYPH_SCAN_CONFIG.stableFramesNeeded * 100)
    );
    const overallConfidence = Math.min(
        100,
        Math.round(best.overallConfidence * 0.78 + stabilityConfidence * 0.22)
    );
    const lockReady =
        overallConfidence >= GLYPH_SCAN_CONFIG.attuneConfidence &&
        stableMarkerFrames >= GLYPH_SCAN_CONFIG.stableFramesNeeded;

    if (lockReady && stableHoldStartedAt === null) {
        stableHoldStartedAt = Date.now();
    }

    if (!lockReady) {
        stableHoldStartedAt = null;
    }

    const holdDuration = stableHoldStartedAt === null ? 0 : Date.now() - stableHoldStartedAt;
    const confirmed = lockReady && holdDuration >= GLYPH_SCAN_CONFIG.holdMs;
    const status = confirmed ? "sigilLocked" : (lockReady ? "holdingSteady" : "signalFound");
    const holdProgress = Math.min(100, Math.round(holdDuration / GLYPH_SCAN_CONFIG.holdMs * 100));
    const label = formatDetectedGlyph(best.glyphId);

    drawCandidateOverlay(context, best.box, overallConfidence, confirmed, best.shape);

    onResult(smoothScannerResult(createScannerResult({
        title: confirmed ? "Sigil Bound" : "Detected: " + label,
        message: confirmed ? "Target Match: " + label : "Detected: " + label,
        status: status,
        glyphId: best.glyphId,
        color: best.color,
        colorFamily: best.color,
        shape: best.shape,
        colorConfidence: best.colorConfidence,
        shapeConfidence: best.shapeConfidence,
        stabilityConfidence: stabilityConfidence,
        overallConfidence: overallConfidence,
        colorSignal: best.colorConfidence,
        symbolMatch: best.shapeConfidence,
        lightQuality: lighting.quality,
        frameStability: stabilityConfidence,
        lockConfidence: overallConfidence,
        boundingBox: best.box,
        box: best.box,
        holdProgress: holdProgress,
        confirmed: confirmed
    })));
}

function createScannerResult(overrides) {
    return Object.assign({
        glyphId: null,
        color: null,
        colorFamily: null,
        shape: null,
        colorConfidence: 0,
        shapeConfidence: 0,
        stabilityConfidence: 0,
        overallConfidence: 0,
        colorSignal: 0,
        symbolMatch: 0,
        lightQuality: 0,
        frameStability: 0,
        lockConfidence: 0,
        boundingBox: null,
        box: null,
        matchedTarget: false,
        title: "Searching for Sigil",
        message: "Searching for Sigil",
        status: "searching",
        holdProgress: 0,
        confirmed: false,
        timestamp: Date.now()
    }, overrides || {});
}

function smoothScannerResult(result) {
    const weight = result.status === "searching" ? 0.34 : 0.5;

    ["colorSignal", "symbolMatch", "lightQuality", "frameStability", "lockConfidence"].forEach(function(key) {
        smoothedResult[key] = smoothedResult[key] * (1 - weight) + (result[key] || 0) * weight;
        result[key] = Math.round(smoothedResult[key]);
    });

    result.colorConfidence = result.colorSignal;
    result.shapeConfidence = result.symbolMatch;
    result.stabilityConfidence = result.frameStability;
    result.overallConfidence = result.lockConfidence;

    return result;
}

function estimateSceneLighting(data) {
    let neutralRed = 0;
    let neutralGreen = 0;
    let neutralBlue = 0;
    let neutralCount = 0;
    let brightnessTotal = 0;
    let usableCount = 0;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const brightness = (r + g + b) / 3;
        const chroma = max - min;

        if (brightness > 28 && brightness < 245) {
            brightnessTotal += brightness;
            usableCount += 1;

            if (chroma < 42) {
                neutralRed += r;
                neutralGreen += g;
                neutralBlue += b;
                neutralCount += 1;
            }
        }
    }

    const quality = usableCount === 0 ? 0 : Math.max(15, Math.min(100, Math.round((brightnessTotal / usableCount) / 180 * 100)));

    if (neutralCount < 40) {
        return {
            red: 128,
            green: 128,
            blue: 128,
            quality: quality
        };
    }

    return {
        red: neutralRed / neutralCount,
        green: neutralGreen / neutralCount,
        blue: neutralBlue / neutralCount,
        quality: quality
    };
}

function buildGlyphMask(data, width, height, lighting) {
    const mask = new Uint8Array(width * height);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;
            const corrected = correctForLighting(data[index], data[index + 1], data[index + 2], lighting);
            const colorCode = getGlyphColorCode(corrected.r, corrected.g, corrected.b);

            if (colorCode > 0) {
                mask[y * width + x] = colorCode;
            }
        }
    }

    return mask;
}

function correctForLighting(r, g, b, lighting) {
    const averageLight = (lighting.red + lighting.green + lighting.blue) / 3;

    return {
        r: clampColor(r * averageLight / Math.max(lighting.red, 1)),
        g: clampColor(g * averageLight / Math.max(lighting.green, 1)),
        b: clampColor(b * averageLight / Math.max(lighting.blue, 1))
    };
}

function clampColor(value) {
    return Math.max(0, Math.min(255, value));
}

function rgbToHsv(r, g, b) {
    r = r / 255;
    g = g / 255;
    b = b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let hue = 0;

    if (delta !== 0) {
        if (max === r) {
            hue = 60 * (((g - b) / delta) % 6);
        } else if (max === g) {
            hue = 60 * (((b - r) / delta) + 2);
        } else {
            hue = 60 * (((r - g) / delta) + 4);
        }
    }

    if (hue < 0) {
        hue += 360;
    }

    return {
        hue: hue,
        saturation: max === 0 ? 0 : delta / max,
        value: max
    };
}

function getGlyphColorCode(r, g, b) {
    const hsv = rgbToHsv(r, g, b);
    const brightness = (r + g + b) / 3;

    if (hsv.value < 0.29 && hsv.saturation < 0.34 && brightness < 82) {
        return 5;
    }

    if (hsv.saturation < 0.23 || hsv.value < 0.18) {
        return 0;
    }

    if ((hsv.hue <= 18 || hsv.hue >= 346) && r > g * 1.22 && r > b * 1.14) {
        return 1;
    }

    if (hsv.hue >= 34 && hsv.hue <= 68 && r > 110 && g > 95 && b < Math.min(r, g) * 0.82) {
        return 2;
    }

    if (hsv.hue >= 190 && hsv.hue <= 252 && b > r * 1.14 && b > g * 1.04) {
        return 3;
    }

    if (hsv.hue >= 82 && hsv.hue <= 168 && g > r * 1.03 && g > b * 1.02) {
        return 4;
    }

    return 0;
}

function getGlyphColorFamily(code) {
    return COLOR_CODE_TO_GLYPH[code] || null;
}

function findGlyphComponents(mask, width, height) {
    const visited = new Uint8Array(width * height);
    const components = [];

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const startIndex = y * width + x;

            if (mask[startIndex] === 0 || visited[startIndex]) {
                continue;
            }

            const component = floodFillComponent(x, y, mask[startIndex], mask, visited, width, height);

            if (component.count >= GLYPH_SCAN_CONFIG.minComponentPixels) {
                components.push(component);
            }
        }
    }

    return components;
}

function floodFillComponent(startX, startY, colorCode, mask, visited, width, height) {
    const stack = [{ x: startX, y: startY }];
    let count = 0;
    let minX = startX;
    let maxX = startX;
    let minY = startY;
    let maxY = startY;

    while (stack.length > 0) {
        const point = stack.pop();

        if (point.x < 0 || point.x >= width || point.y < 0 || point.y >= height) {
            continue;
        }

        const index = point.y * width + point.x;

        if (visited[index] || mask[index] !== colorCode) {
            continue;
        }

        visited[index] = 1;
        count += 1;
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);

        stack.push({ x: point.x + 1, y: point.y });
        stack.push({ x: point.x - 1, y: point.y });
        stack.push({ x: point.x, y: point.y + 1 });
        stack.push({ x: point.x, y: point.y - 1 });
    }

    return {
        count: count,
        colorCode: colorCode,
        color: getGlyphColorFamily(colorCode),
        box: {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        }
    };
}

function scoreBestCandidate(components, mask, width, height) {
    let best = null;

    components.forEach(function(component) {
        const box = component.box;
        const boxArea = box.width * box.height;
        const frameArea = width * height;
        const sizeRatio = boxArea / frameArea;
        const aspect = box.width / Math.max(box.height, 1);
        const density = component.count / Math.max(boxArea, 1);

        if (sizeRatio < GLYPH_SCAN_CONFIG.minSizeRatio || sizeRatio > GLYPH_SCAN_CONFIG.maxSizeRatio) {
            return;
        }

        if (box.x <= 1 || box.y <= 1 || box.x + box.width >= width - 1 || box.y + box.height >= height - 1) {
            return;
        }

        const hollowScore = calculateHollowCenterScore(box, mask, width);
        const shapeScores = calculateShapeScores(box, mask, width, component.count, aspect, density, hollowScore);
        const shape = pickShape(shapeScores);
        const shapeConfidence = Math.round(shapeScores[shape] * 100);
        const colorConfidence = calculateColorConfidence(component, boxArea);
        const centerScore = calculateCenterScore(box, width, height);
        let overallConfidence = Math.round(
            colorConfidence * 0.33 +
            shapeConfidence * 0.36 +
            hollowScore * 100 * 0.13 +
            centerScore * 100 * 0.10 +
            scoreRange(density, 0.025, 0.36) * 100 * 0.08
        );

        if (component.color === "black" && shapeConfidence < 76) {
            overallConfidence = Math.min(overallConfidence, 68);
        }

        const glyphId = component.color + "_" + shape;
        const candidate = {
            glyphId: glyphId,
            color: component.color,
            shape: shape,
            box: box,
            colorConfidence: colorConfidence,
            shapeConfidence: shapeConfidence,
            hollowScore: hollowScore * 100,
            overallConfidence: overallConfidence,
            total: overallConfidence + centerScore * 8 + sizeRatio * 20
        };

        if (!best || candidate.total > best.total) {
            best = candidate;
        }
    });

    return best;
}

function calculateColorConfidence(component, boxArea) {
    const density = component.count / Math.max(boxArea, 1);
    const sizeScore = Math.min(1, component.count / 150);
    const densityScore = scoreRange(density, 0.025, 0.38);
    const blackPenalty = component.color === "black" ? 0.92 : 1;

    return Math.round(Math.min(100, (sizeScore * 58 + densityScore * 42) * blackPenalty));
}

function calculateShapeScores(box, mask, width, count, aspect, density, hollowScore) {
    const triangleProfile = calculateTriangleProfileScore(box, mask, width);
    const circleProfile = calculateCircleProfileScore(box, mask, width);
    const squareProfile = calculateSquareProfileScore(box, mask, width);
    const aspectSquare = scoreRange(aspect, 0.72, 1.34);
    const aspectLoose = scoreRange(aspect, 0.52, 1.9);
    const densityOutline = scoreRange(density, 0.03, 0.32);

    return {
        triangle: clamp01(triangleProfile * 0.55 + hollowScore * 0.24 + aspectLoose * 0.13 + densityOutline * 0.08),
        circle: clamp01(circleProfile * 0.48 + hollowScore * 0.2 + aspectSquare * 0.2 + densityOutline * 0.12),
        square: clamp01(squareProfile * 0.48 + hollowScore * 0.16 + aspectSquare * 0.22 + densityOutline * 0.14)
    };
}

function pickShape(scores) {
    return Object.keys(scores).sort(function(left, right) {
        return scores[right] - scores[left];
    })[0];
}

function scoreRange(value, min, max) {
    if (value >= min && value <= max) {
        return 1;
    }

    if (value < min) {
        return Math.max(0, value / min);
    }

    return Math.max(0, 1 - ((value - max) / Math.max(max, 1)));
}

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function calculateCenterScore(box, width, height) {
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const distance = Math.hypot(centerX - width / 2, centerY - height / 2);
    const maxDistance = Math.hypot(width / 2, height / 2);

    return clamp01(1 - distance / maxDistance);
}

function calculateHollowCenterScore(box, mask, width) {
    const startX = Math.floor(box.x + box.width * 0.3);
    const endX = Math.floor(box.x + box.width * 0.7);
    const startY = Math.floor(box.y + box.height * 0.3);
    const endY = Math.floor(box.y + box.height * 0.7);
    let centerPixels = 0;
    let markedCenterPixels = 0;

    for (let y = startY; y <= endY; y += 1) {
        for (let x = startX; x <= endX; x += 1) {
            centerPixels += 1;

            if (mask[y * width + x] > 0) {
                markedCenterPixels += 1;
            }
        }
    }

    if (centerPixels === 0) {
        return 0;
    }

    return clamp01(1 - (markedCenterPixels / centerPixels) * 2.6);
}

function calculateTriangleProfileScore(box, mask, width) {
    const buckets = new Array(10).fill(0);

    forEachMaskPixelInBox(box, mask, width, function(x, y) {
        const bucket = Math.min(9, Math.floor((y - box.y) / box.height * 10));
        buckets[bucket] += 1;
    });

    const total = buckets.reduce(function(sum, value) {
        return sum + value;
    }, 0);

    if (total === 0) {
        return 0;
    }

    const top = buckets.slice(0, 3).reduce(sumValues, 0);
    const middle = buckets.slice(3, 7).reduce(sumValues, 0);
    const bottom = buckets.slice(7).reduce(sumValues, 0);
    const directionalScore = clamp01((bottom - top) / Math.max(total * 0.28, 1));
    const varianceScore = calculateVarianceScore(buckets, 1.35);

    return clamp01(varianceScore * 0.56 + directionalScore * 0.44 + (middle > 0 ? 0.08 : 0));
}

function calculateCircleProfileScore(box, mask, width) {
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const radius = (box.width + box.height) / 4;
    const sectors = new Array(16).fill(0);
    let total = 0;
    let radialError = 0;
    let cornerHits = 0;

    forEachMaskPixelInBox(box, mask, width, function(x, y) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.hypot(dx, dy);
        const sector = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * sectors.length) % sectors.length;

        sectors[sector] += 1;
        radialError += Math.abs(distance - radius) / Math.max(radius, 1);
        total += 1;

        if (isInCornerZone(x, y, box)) {
            cornerHits += 1;
        }
    });

    if (total === 0) {
        return 0;
    }

    const coverage = sectors.filter(function(value) {
        return value > 0;
    }).length / sectors.length;
    const radialScore = clamp01(1 - radialError / total * 1.7);
    const cornerPenalty = clamp01(1 - (cornerHits / total) * 3.4);

    return clamp01(coverage * 0.32 + radialScore * 0.48 + cornerPenalty * 0.2);
}

function calculateSquareProfileScore(box, mask, width) {
    let total = 0;
    let edgeHits = 0;
    let cornerHits = 0;

    forEachMaskPixelInBox(box, mask, width, function(x, y) {
        total += 1;

        if (isNearBoxEdge(x, y, box)) {
            edgeHits += 1;
        }

        if (isInCornerZone(x, y, box)) {
            cornerHits += 1;
        }
    });

    if (total === 0) {
        return 0;
    }

    const edgeScore = clamp01(edgeHits / total * 1.3);
    const cornerScore = clamp01(cornerHits / total * 4.2);

    return clamp01(edgeScore * 0.54 + cornerScore * 0.46);
}

function forEachMaskPixelInBox(box, mask, width, callback) {
    for (let y = box.y; y < box.y + box.height; y += 1) {
        for (let x = box.x; x < box.x + box.width; x += 1) {
            if (mask[y * width + x] > 0) {
                callback(x, y);
            }
        }
    }
}

function isNearBoxEdge(x, y, box) {
    const edge = Math.max(3, Math.round(Math.min(box.width, box.height) * 0.14));

    return x <= box.x + edge ||
        x >= box.x + box.width - edge ||
        y <= box.y + edge ||
        y >= box.y + box.height - edge;
}

function isInCornerZone(x, y, box) {
    const zoneX = box.width * 0.25;
    const zoneY = box.height * 0.25;
    const left = x <= box.x + zoneX;
    const right = x >= box.x + box.width - zoneX;
    const top = y <= box.y + zoneY;
    const bottom = y >= box.y + box.height - zoneY;

    return (left || right) && (top || bottom);
}

function calculateVarianceScore(values, divisor) {
    const total = values.reduce(sumValues, 0);

    if (total === 0) {
        return 0;
    }

    const mean = total / values.length;
    let variance = 0;

    values.forEach(function(value) {
        variance += Math.pow(value - mean, 2);
    });

    variance = variance / values.length;

    return clamp01((Math.sqrt(variance) / Math.max(mean, 1)) / divisor);
}

function sumValues(sum, value) {
    return sum + value;
}

function updateStability(glyphId, box, confidence) {
    if (!lastBestBox || stableGlyphId !== glyphId) {
        stableMarkerFrames = 1;
        stableGlyphId = glyphId;
        lastBestBox = box;
        return;
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const lastCenterX = lastBestBox.x + lastBestBox.width / 2;
    const lastCenterY = lastBestBox.y + lastBestBox.height / 2;
    const movement = Math.hypot(centerX - lastCenterX, centerY - lastCenterY);
    const sizeDelta = Math.abs((box.width * box.height) - (lastBestBox.width * lastBestBox.height)) /
        Math.max(lastBestBox.width * lastBestBox.height, 1);

    if (movement < 18 && sizeDelta < 0.32 && confidence >= GLYPH_SCAN_CONFIG.tentativeConfidence) {
        stableMarkerFrames += 1;
    } else {
        stableMarkerFrames = 1;
    }

    stableGlyphId = glyphId;
    lastBestBox = box;
}

function drawScannerAtmosphere(context, width, height) {
    const now = Date.now() / 1000;
    const scanY = (Math.sin(now * 1.5) * 0.5 + 0.5) * height;

    context.save();
    context.globalAlpha = 0.16;
    context.strokeStyle = "#74f7ff";
    context.lineWidth = 1;

    for (let y = 18; y < height; y += 28) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
    }

    context.globalAlpha = 0.38;
    context.strokeStyle = "#9fd4ff";
    context.beginPath();
    context.moveTo(0, scanY);
    context.lineTo(width, scanY);
    context.stroke();
    context.restore();
}

function drawCandidateOverlay(context, box, confidence, confirmed, shape) {
    const corner = Math.min(18, box.width * 0.24, box.height * 0.24);

    context.save();
    context.lineWidth = confirmed ? 4 : 3;
    context.strokeStyle = confirmed ? "#74f79b" : "#ffd166";
    context.shadowColor = confirmed ? "#74f79b" : "#74f7ff";
    context.shadowBlur = confirmed ? 18 : 12;

    drawCorner(context, box.x, box.y, corner, "tl");
    drawCorner(context, box.x + box.width, box.y, corner, "tr");
    drawCorner(context, box.x, box.y + box.height, corner, "bl");
    drawCorner(context, box.x + box.width, box.y + box.height, corner, "br");

    context.globalAlpha = confirmed ? 0.28 : 0.18;
    context.beginPath();
    context.ellipse(
        box.x + box.width / 2,
        box.y + box.height / 2,
        box.width * 0.72,
        box.height * 0.72,
        0,
        0,
        Math.PI * 2
    );
    context.stroke();

    context.globalAlpha = 1;
    context.font = "bold 14px Arial";
    context.fillStyle = confirmed ? "#74f79b" : "#ffd166";
    context.fillText(confidence + "% " + shape, box.x, Math.max(18, box.y - 6));
    context.restore();
}

function drawCorner(context, x, y, length, corner) {
    context.beginPath();

    if (corner === "tl") {
        context.moveTo(x + length, y);
        context.lineTo(x, y);
        context.lineTo(x, y + length);
    } else if (corner === "tr") {
        context.moveTo(x - length, y);
        context.lineTo(x, y);
        context.lineTo(x, y + length);
    } else if (corner === "bl") {
        context.moveTo(x, y - length);
        context.lineTo(x, y);
        context.lineTo(x + length, y);
    } else {
        context.moveTo(x - length, y);
        context.lineTo(x, y);
        context.lineTo(x, y - length);
    }

    context.stroke();
}

function formatDetectedGlyph(glyphId) {
    if (window.QuestGlyphs && window.QuestGlyphs.formatGlyphLabel) {
        return window.QuestGlyphs.formatGlyphLabel(glyphId);
    }

    return String(glyphId || "unknown").replace("_", " ");
}
