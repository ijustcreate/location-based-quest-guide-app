// ==================================================
// Quest Compass Camera Marker Detector
// ==================================================
//
// This file handles camera access and red triangle detection.
//
// It treats the camera frame like a rough Photoshop file:
//
// 1. Sample scene lighting.
// 2. Estimate the color cast.
// 3. Correct pixels against that lighting.
// 4. Convert corrected pixels to HSV.
// 5. Look for red marker pixels.
// 6. Estimate whether the red area behaves like a triangle.
//
// This is a prototype detector.
// It is local, free, and does not use cloud AI.

let cameraStream = null;
let cameraDetectionTimer = null;
let stableMarkerFrames = 0;

function startCameraMarkerDetection(videoElement, canvasElement, statusElement) {
    // Ask for rear camera access.

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        statusElement.textContent = "Camera is not supported on this device.";
        statusElement.className = "markerLost";
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

        statusElement.textContent = "Camera active. Searching for red triangle...";
        statusElement.className = "markerSearching";

        videoElement.play();

        if (cameraDetectionTimer) {
            clearInterval(cameraDetectionTimer);
        }

        cameraDetectionTimer = setInterval(function() {
            detectRedTriangle(
                videoElement,
                canvasElement,
                statusElement
            );
        }, 250);

    }).catch(function(error) {
        statusElement.textContent = "Camera error: " + error.message;
        statusElement.className = "markerLost";
    });
}

function detectRedTriangle(videoElement, canvasElement, statusElement) {
    // Only scan when the camera has real video dimensions.

    if (!videoElement.videoWidth || !videoElement.videoHeight) {
        return;
    }

    const context = canvasElement.getContext("2d");

    // Use a smaller scan size for speed.
    // This keeps the phone from melting like a cursed Game Boy.

    const scanWidth = 240;

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

    const result = analyzeRedTriangle(
        frame.data,
        scanWidth,
        scanHeight,
        lighting
    );

    drawDetectionOverlay(
        context,
        result
    );

    if (result.confidence >= 70) {
        stableMarkerFrames += 1;
    } else {
        stableMarkerFrames = 0;
    }

    if (stableMarkerFrames >= 4) {
        statusElement.textContent =
            "Red triangle confirmed 🔺 Confidence: " +
            result.confidence +
            "%";

        statusElement.className = "markerFound";
        return;
    }

    if (result.redPixels > 0) {
        statusElement.textContent =
            "Red found. Triangle confidence: " +
            result.confidence +
            "%. Hold steady.";

        statusElement.className = "markerSearching";
        return;
    }

    statusElement.textContent =
        "Searching for red triangle. Lighting correction active.";

    statusElement.className = "markerSearching";
}

function estimateSceneLighting(data) {
    // Estimate the light color in the scene.
    //
    // This is the "turn off the lighting layer" approximation.
    //
    // We prefer neutral-ish pixels because they reveal the lighting color.
    // White paper under yellow light looks yellow.
    // Gray rock under blue shade looks blue.
    //
    // If we cannot find enough neutral pixels, we fall back to averaging
    // the full frame.

    let neutralRedTotal = 0;
    let neutralGreenTotal = 0;
    let neutralBlueTotal = 0;
    let neutralCount = 0;

    let fallbackRedTotal = 0;
    let fallbackGreenTotal = 0;
    let fallbackBlueTotal = 0;
    let fallbackCount = 0;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const brightness = (r + g + b) / 3;
        const chroma = max - min;

        if (brightness > 35 && brightness < 240) {
            fallbackRedTotal += r;
            fallbackGreenTotal += g;
            fallbackBlueTotal += b;
            fallbackCount += 1;

            if (chroma < 35) {
                neutralRedTotal += r;
                neutralGreenTotal += g;
                neutralBlueTotal += b;
                neutralCount += 1;
            }
        }
    }

    if (neutralCount > 80) {
        return {
            red: neutralRedTotal / neutralCount,
            green: neutralGreenTotal / neutralCount,
            blue: neutralBlueTotal / neutralCount
        };
    }

    if (fallbackCount > 0) {
        return {
            red: fallbackRedTotal / fallbackCount,
            green: fallbackGreenTotal / fallbackCount,
            blue: fallbackBlueTotal / fallbackCount
        };
    }

    return {
        red: 128,
        green: 128,
        blue: 128
    };
}

function correctForLighting(r, g, b, lighting) {
    // White-balance correction.
    //
    // If the lighting is too warm, red may be overrepresented.
    // If the lighting is too cool, blue may be overrepresented.
    //
    // This divides the pixel by the estimated lighting color,
    // then rescales it back into normal RGB.

    const averageLight =
        (lighting.red + lighting.green + lighting.blue) / 3;

    const correctedRed =
        clampColor(r * averageLight / Math.max(lighting.red, 1));

    const correctedGreen =
        clampColor(g * averageLight / Math.max(lighting.green, 1));

    const correctedBlue =
        clampColor(b * averageLight / Math.max(lighting.blue, 1));

    return {
        r: correctedRed,
        g: correctedGreen,
        b: correctedBlue
    };
}

function clampColor(value) {
    // Keep color values inside the normal 0-255 range.

    return Math.max(
        0,
        Math.min(
            255,
            value
        )
    );
}

function rgbToHsv(r, g, b) {
    // Convert RGB into HSV.
    //
    // HSV separates:
    // hue = color family
    // saturation = color strength
    // value = brightness

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

    const saturation =
        max === 0 ? 0 : delta / max;

    const value = max;

    return {
        hue: hue,
        saturation: saturation,
        value: value
    };
}

function isRedMarkerPixel(r, g, b, lighting) {
    // Correct the pixel first.
    // Then judge color using HSV, not raw RGB.

    const corrected =
        correctForLighting(
            r,
            g,
            b,
            lighting
        );

    const hsv =
        rgbToHsv(
            corrected.r,
            corrected.g,
            corrected.b
        );

    const hueIsRed =
        hsv.hue < 22 || hsv.hue > 338;

    const saturatedEnough =
        hsv.saturation > 0.38;

    const brightEnough =
        hsv.value > 0.18;

    return hueIsRed && saturatedEnough && brightEnough;
}

function analyzeRedTriangle(data, width, height, lighting) {
    // Find red pixels and measure their shape.

    let redPixels = 0;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    const rowBuckets = new Array(12).fill(0);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;

            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];

            if (
                isRedMarkerPixel(
                    r,
                    g,
                    b,
                    lighting
                )
            ) {
                redPixels += 1;

                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);

                const bucket = Math.floor(
                    y / height * rowBuckets.length
                );

                rowBuckets[
                    Math.min(bucket, rowBuckets.length - 1)
                ] += 1;
            }
        }
    }

    if (redPixels < 45) {
        return {
            redPixels: redPixels,
            confidence: 0,
            box: null
        };
    }

    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const boxArea = boxWidth * boxHeight;

    const frameArea = width * height;

    const boxSizeRatio = boxArea / frameArea;

    const aspectRatio = boxWidth / Math.max(boxHeight, 1);

    const density = redPixels / Math.max(boxArea, 1);

    const sizeScore =
        scoreRange(
            boxSizeRatio,
            0.015,
            0.35
        );

    const aspectScore =
        scoreRange(
            aspectRatio,
            0.55,
            1.9
        );

    const densityScore =
        scoreRange(
            density,
            0.025,
            0.45
        );

    const profileScore =
        calculateTriangleProfileScore(rowBuckets);

    const confidence = Math.round(
        sizeScore * 25 +
        aspectScore * 20 +
        densityScore * 20 +
        profileScore * 35
    );

    return {
        redPixels: redPixels,
        confidence: confidence,
        box: {
            x: minX,
            y: minY,
            width: boxWidth,
            height: boxHeight
        }
    };
}

function scoreRange(value, min, max) {
    // Returns 1 if value is inside a useful range.
    // Returns lower scores when outside the range.

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

function calculateTriangleProfileScore(rowBuckets) {
    // A triangle usually changes width across its height.
    //
    // A rectangle has a flatter row profile.
    // A triangle has row counts that vary more strongly.

    const total = rowBuckets.reduce(
        function(sum, value) {
            return sum + value;
        },
        0
    );

    if (total === 0) {
        return 0;
    }

    const mean =
        total / rowBuckets.length;

    let variance = 0;

    rowBuckets.forEach(function(value) {
        variance += Math.pow(value - mean, 2);
    });

    variance =
        variance / rowBuckets.length;

    const standardDeviation =
        Math.sqrt(variance);

    const variation =
        standardDeviation / Math.max(mean, 1);

    return Math.max(
        0,
        Math.min(
            1,
            variation / 1.4
        )
    );
}

function drawDetectionOverlay(context, result) {
    // Draw a box around the detected red marker area.
    // This makes testing easier.

    if (!result.box) {
        return;
    }

    context.lineWidth = 3;
    context.strokeStyle = "lime";

    context.strokeRect(
        result.box.x,
        result.box.y,
        result.box.width,
        result.box.height
    );

    context.font = "14px Arial";
    context.fillStyle = "lime";

    context.fillText(
        result.confidence + "%",
        result.box.x,
        Math.max(16, result.box.y - 6)
    );
}