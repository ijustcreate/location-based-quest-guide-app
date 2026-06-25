// ==================================================
// Quest Compass Camera Marker Detector
// ==================================================
//
// This is the Sigil Scanner system.
//
// It opens the camera and looks for red, green, or pink hollow triangles.
// It returns scanner data back to app.js so the UI can show:
// - color signal
// - symbol match
// - light quality
// - frame stability
// - confidence
//
// This detector is intentionally local.
// No cloud. No database. No paid API.

let cameraStream = null;
let cameraDetectionTimer = null;
let stableMarkerFrames = 0;
let lastBestBox = null;
let stableHoldStartedAt = null;
let smoothedResult = {
    colorSignal: 0,
    symbolMatch: 0,
    lightQuality: 0,
    frameStability: 0,
    lockConfidence: 0
};

function startCameraMarkerDetection(videoElement, canvasElement, onResult) {
    // Ask for the rear camera if possible.

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onResult({
            title: "Camera unavailable",
            message: "This browser does not support camera access.",
            status: "error",
            colorSignal: 0,
            symbolMatch: 0,
            lightQuality: 0,
            frameStability: 0,
            lockConfidence: 0,
            confirmed: false
        });

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

        onResult({
            title: "Searching for sigils...",
            message: "Point your camera at a quest glyph.",
            status: "searching",
            colorSignal: 0,
            symbolMatch: 0,
            lightQuality: 0,
            frameStability: 0,
            lockConfidence: 0,
            confirmed: false
        });

        if (cameraDetectionTimer) {
            clearInterval(cameraDetectionTimer);
        }

        cameraDetectionTimer = setInterval(function() {
            scanFrameForGlyphTriangle(
                videoElement,
                canvasElement,
                onResult
            );
        }, 250);

    }).catch(function(error) {
        onResult({
            title: "Camera error",
            message: error.message,
            status: "error",
            colorSignal: 0,
            symbolMatch: 0,
            lightQuality: 0,
            frameStability: 0,
            lockConfidence: 0,
            confirmed: false
        });
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
    lastBestBox = null;
    stableHoldStartedAt = null;
}

function scanFrameForGlyphTriangle(videoElement, canvasElement, onResult) {
    // Do not scan until video is ready.

    if (!videoElement.videoWidth || !videoElement.videoHeight) {
        return;
    }

    const context = canvasElement.getContext("2d");

    const scanWidth = 220;

    const scanHeight = Math.round(
        videoElement.videoHeight / videoElement.videoWidth * scanWidth
    );

    canvasElement.width = scanWidth;
    canvasElement.height = scanHeight;

    context.drawImage(
        videoElement,
        0,
        0,
        scanWidth,
        scanHeight
    );

    const frame = context.getImageData(
        0,
        0,
        scanWidth,
        scanHeight
    );

    const lighting = estimateSceneLighting(frame.data);

    const mask = buildGlyphMask(
        frame.data,
        scanWidth,
        scanHeight,
        lighting
    );

    const candidates = findGlyphComponents(
        mask,
        scanWidth,
        scanHeight
    );

    const best = scoreBestCandidate(
        candidates,
        mask,
        scanWidth,
        scanHeight
    );

    context.drawImage(
        videoElement,
        0,
        0,
        scanWidth,
        scanHeight
    );

    if (!best) {
        stableMarkerFrames = 0;
        lastBestBox = null;
        stableHoldStartedAt = null;

        onResult(smoothScannerResult({
            title: "Searching for sigils...",
            message: "Point your camera at a red, green, or pink hollow triangle.",
            status: "searching",
            colorSignal: 0,
            symbolMatch: 0,
            lightQuality: lighting.quality,
            frameStability: 0,
            lockConfidence: 0,
            confirmed: false
        }));

        return;
    }

    updateStability(best.box);

    const frameStability = Math.min(
        100,
        stableMarkerFrames * 25
    );

    let lockConfidence = Math.round(
        best.colorSignal * 0.35 +
        best.shapeMatch * 0.24 +
        lighting.quality * 0.16 +
        frameStability * 0.18 +
        best.hollowScore * 0.07
    );

    if (best.colorSignal >= 90 && best.shapeMatch >= 50 && lighting.quality >= 40) {
        lockConfidence = Math.min(100, lockConfidence + 12);
    }

    const lockReady =
        best.colorSignal >= 75 &&
        best.shapeMatch >= 50 &&
        frameStability >= 50 &&
        lighting.quality >= 25 &&
        lockConfidence >= 72;

    if (lockReady && stableHoldStartedAt === null) {
        stableHoldStartedAt = Date.now();
    }

    if (!lockReady) {
        stableHoldStartedAt = null;
    }

    const holdDuration = stableHoldStartedAt === null ? 0 : Date.now() - stableHoldStartedAt;
    const confirmed = holdDuration >= 1250;
    const status = confirmed ? "sigilLocked" : (lockReady ? "holdingSteady" : "signalFound");
    const holdProgress = Math.min(100, Math.round(holdDuration / 1250 * 100));

    drawCandidateOverlay(
        context,
        best.box,
        lockConfidence,
        confirmed
    );

    onResult(smoothScannerResult({
        title: confirmed ? "Sigil Locked" : (lockReady ? "Hold steady" : "Signal found"),
        message: confirmed ?
            "Marker confirmed." :
            best.colorFamily + " triangle found. Center the glyph and hold still.",
        status: status,
        colorSignal: best.colorSignal,
        colorFamily: best.colorFamily,
        shape: "hollow-triangle",
        symbolMatch: best.shapeMatch,
        lightQuality: lighting.quality,
        frameStability: frameStability,
        lockConfidence: lockConfidence,
        holdProgress: holdProgress,
        confirmed: confirmed
    }));
}

function smoothScannerResult(result) {
    const weight = result.status === "searching" ? 0.35 : 0.45;

    ["colorSignal", "symbolMatch", "lightQuality", "frameStability", "lockConfidence"].forEach(function(key) {
        smoothedResult[key] = smoothedResult[key] * (1 - weight) + (result[key] || 0) * weight;
        result[key] = Math.round(smoothedResult[key]);
    });

    return result;
}

function estimateSceneLighting(data) {
    // Estimate scene lighting color.
    //
    // This approximates removing the "lighting layer"
    // before reading marker color.

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

        if (brightness > 35 && brightness < 235) {
            brightnessTotal += brightness;
            usableCount += 1;

            if (chroma < 38) {
                neutralRed += r;
                neutralGreen += g;
                neutralBlue += b;
                neutralCount += 1;
            }
        }
    }

    const quality = usableCount === 0 ?
        0 :
        Math.max(
            15,
            Math.min(
                100,
                Math.round((brightnessTotal / usableCount) / 180 * 100)
            )
        );

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
    // Create a black/white layer:
    // 0 = not a target glyph pixel
    // 1 = red, 2 = green, 3 = pink target glyph pixel
    // 0 = not red

    const mask = new Uint8Array(width * height);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;

            const corrected = correctForLighting(
                data[index],
                data[index + 1],
                data[index + 2],
                lighting
            );

            const colorCode = getGlyphColorCode(corrected.r, corrected.g, corrected.b);

            if (colorCode > 0) {
                mask[y * width + x] = colorCode;
            }
        }
    }

    return mask;
}

function correctForLighting(r, g, b, lighting) {
    // Divide by estimated lighting color and rescale.
    // This is the cheap but useful "turn off lighting layer" trick.

    const averageLight =
        (lighting.red + lighting.green + lighting.blue) / 3;

    return {
        r: clampColor(r * averageLight / Math.max(lighting.red, 1)),
        g: clampColor(g * averageLight / Math.max(lighting.green, 1)),
        b: clampColor(b * averageLight / Math.max(lighting.blue, 1))
    };
}

function clampColor(value) {
    // Keep color values inside RGB range.

    return Math.max(
        0,
        Math.min(
            255,
            value
        )
    );
}

function rgbToHsv(r, g, b) {
    // HSV separates color from brightness better than raw RGB.

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

    if (hsv.saturation <= 0.24 || hsv.value <= 0.12) {
        return 0;
    }

    if (hsv.hue < 22 || hsv.hue > 338) {
        return 1;
    }

    if (hsv.hue >= 72 && hsv.hue <= 160) {
        return 2;
    }

    if (
        (hsv.hue >= 270 && hsv.hue <= 337) ||
        (r > 135 && b > 105 && r > g * 1.18 && b > g * 1.08)
    ) {
        return 3;
    }

    return 0;
}

function getGlyphColorFamily(code) {
    if (code === 2) return "green";
    if (code === 3) return "pink";
    return "red";
}

function findGlyphComponents(mask, width, height) {
    // Find separate glyph blobs instead of one giant scene-wide box.

    const visited = new Uint8Array(width * height);
    const components = [];

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const startIndex = y * width + x;

            if (mask[startIndex] === 0 || visited[startIndex]) {
                continue;
            }

            const component = floodFillComponent(
                x,
                y,
                mask[startIndex],
                mask,
                visited,
                width,
                height
            );

            if (component.count >= 18) {
                components.push(component);
            }
        }
    }

    return components;
}

function floodFillComponent(startX, startY, colorCode, mask, visited, width, height) {
    // Basic connected-component search.

    const stack = [
        {
            x: startX,
            y: startY
        }
    ];

    let count = 0;
    let minX = startX;
    let maxX = startX;
    let minY = startY;
    let maxY = startY;

    while (stack.length > 0) {
        const point = stack.pop();

        if (
            point.x < 0 ||
            point.x >= width ||
            point.y < 0 ||
            point.y >= height
        ) {
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
        colorFamily: getGlyphColorFamily(colorCode),
        box: {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        }
    };
}

function scoreBestCandidate(components, mask, width, height) {
    // Judge each red blob and choose the best marker candidate.

    let best = null;

    components.forEach(function(component) {
        const box = component.box;
        const boxArea = box.width * box.height;
        const frameArea = width * height;

        const sizeRatio = boxArea / frameArea;
        const aspect = box.width / Math.max(box.height, 1);
        const density = component.count / Math.max(boxArea, 1);

        if (sizeRatio < 0.002 || sizeRatio > 0.22) {
            return;
        }

        if (box.x <= 1 || box.y <= 1 || box.x + box.width >= width - 1 || box.y + box.height >= height - 1) {
            return;
        }

        const colorSignal = Math.min(
            100,
            Math.round(component.count / 160 * 100)
        );

        const aspectScore =
            scoreRange(
                aspect,
                0.45,
                2.2
            );

        const densityScore =
            scoreRange(
                density,
                0.035,
                0.38
            );

        const hollowScore =
            calculateHollowCenterScore(
                box,
                mask,
                width
            );

        const triangleProfile =
            calculateTriangleProfileScore(
                box,
                mask,
                width
            );

        const shapeMatch = Math.round(
            aspectScore * 22 +
            densityScore * 22 +
            hollowScore * 28 +
            triangleProfile * 28
        );

        const candidate = {
            box: box,
            colorSignal: colorSignal,
            colorFamily: component.colorFamily,
            shapeMatch: shapeMatch,
            hollowScore: hollowScore * 100,
            total: colorSignal * 0.35 + shapeMatch * 0.65
        };

        if (!best || candidate.total > best.total) {
            best = candidate;
        }
    });

    return best;
}

function scoreRange(value, min, max) {
    // Score 1 inside a useful range.
    // Score lower outside it.

    if (value >= min && value <= max) {
        return 1;
    }

    if (value < min) {
        return Math.max(
            0,
            value / min
        );
    }

    return Math.max(
        0,
        1 - ((value - max) / max)
    );
}

function calculateHollowCenterScore(box, mask, width) {
    // A triangle outline should have a mostly non-red center.

    const startX = Math.floor(box.x + box.width * 0.32);
    const endX = Math.floor(box.x + box.width * 0.68);

    const startY = Math.floor(box.y + box.height * 0.32);
    const endY = Math.floor(box.y + box.height * 0.68);

    let centerPixels = 0;
    let redCenterPixels = 0;

    for (let y = startY; y <= endY; y += 1) {
        for (let x = startX; x <= endX; x += 1) {
            centerPixels += 1;

            if (mask[y * width + x] === 1) {
                redCenterPixels += 1;
            }
        }
    }

    if (centerPixels === 0) {
        return 0;
    }

    const redCenterRatio =
        redCenterPixels / centerPixels;

    return Math.max(
        0,
        Math.min(
            1,
            1 - redCenterRatio * 3
        )
    );
}

function calculateTriangleProfileScore(box, mask, width) {
    // A triangle changes width across rows more than a rectangle does.

    const buckets = new Array(10).fill(0);

    for (let y = box.y; y < box.y + box.height; y += 1) {
        for (let x = box.x; x < box.x + box.width; x += 1) {
            if (mask[y * width + x] === 1) {
                const bucket = Math.min(
                    9,
                    Math.floor((y - box.y) / box.height * 10)
                );

                buckets[bucket] += 1;
            }
        }
    }

    const total = buckets.reduce(
        function(sum, value) {
            return sum + value;
        },
        0
    );

    if (total === 0) {
        return 0;
    }

    const mean = total / buckets.length;

    let variance = 0;

    buckets.forEach(function(value) {
        variance += Math.pow(value - mean, 2);
    });

    variance = variance / buckets.length;

    const variation =
        Math.sqrt(variance) / Math.max(mean, 1);

    return Math.max(
        0,
        Math.min(
            1,
            variation / 1.25
        )
    );
}

function updateStability(box) {
    // Increase stability if the candidate box stays in roughly the same place.

    if (!lastBestBox) {
        stableMarkerFrames = 1;
        lastBestBox = box;
        return;
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    const lastCenterX = lastBestBox.x + lastBestBox.width / 2;
    const lastCenterY = lastBestBox.y + lastBestBox.height / 2;

    const movement =
        Math.hypot(
            centerX - lastCenterX,
            centerY - lastCenterY
        );

    if (movement < 22) {
        stableMarkerFrames += 1;
    } else {
        stableMarkerFrames = 1;
    }

    lastBestBox = box;
}

function drawCandidateOverlay(context, box, confidence, confirmed) {
    // Draw scanner overlay.

    context.lineWidth = 3;
    context.strokeStyle = confirmed ? "#74f79b" : "#ffd166";

    context.strokeRect(
        box.x,
        box.y,
        box.width,
        box.height
    );

    context.font = "bold 16px Arial";
    context.fillStyle = confirmed ? "#74f79b" : "#ffd166";

    context.fillText(
        confidence + "%",
        box.x,
        Math.max(18, box.y - 6)
    );
}
