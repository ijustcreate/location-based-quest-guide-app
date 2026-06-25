let cameraStream = null;
let cameraDetectionTimer = null;
let stableMarkerFrames = 0;
let lastBestBox = null;
let stableHoldStartedAt = null;

const smoothedScannerResult = {
  colorSignal: 0,
  symbolMatch: 0,
  lightQuality: 0,
  frameStability: 0,
  lockConfidence: 0
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
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  }).then((stream) => {
    cameraStream = stream;
    videoElement.srcObject = stream;
    videoElement.style.display = "block";
    canvasElement.style.display = "block";

    videoElement.play();

    onResult(createScannerResult({
      title: "Searching for glyphs",
      message: "Point your camera at a colored hollow triangle.",
      status: "searching"
    }));

    if (cameraDetectionTimer) clearInterval(cameraDetectionTimer);

    cameraDetectionTimer = setInterval(() => {
      scanFrameForGlyphTriangle(videoElement, canvasElement, onResult);
    }, 220);
  }).catch((error) => {
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
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  if (videoElement) {
    videoElement.pause();
    videoElement.srcObject = null;
    videoElement.style.display = "none";
  }

  if (canvasElement) {
    const context = canvasElement.getContext("2d");
    context.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasElement.style.display = "none";
  }

  stableMarkerFrames = 0;
  lastBestBox = null;
  stableHoldStartedAt = null;
}

function scanFrameForGlyphTriangle(videoElement, canvasElement, onResult) {
  if (!videoElement.videoWidth || !videoElement.videoHeight) return;

  const context = canvasElement.getContext("2d");
  const scanWidth = 280;
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

  if (!best) {
    stableMarkerFrames = 0;
    lastBestBox = null;
    stableHoldStartedAt = null;

    onResult(smoothScannerResult(createScannerResult({
      title: "Searching for glyphs",
      message: "No stable colored hollow triangle found yet.",
      status: "searching",
      lightQuality: lighting.quality
    })));
    return;
  }

  updateStability(best.box);

  const frameStability = Math.min(100, stableMarkerFrames * 25);
  let lockConfidence = Math.round(
    best.colorSignal * 0.35 +
    best.shapeMatch * 0.28 +
    lighting.quality * 0.16 +
    frameStability * 0.18 +
    best.hollowScore * 0.03
  );

  if (best.colorSignal >= 82 && best.shapeMatch >= 54 && lighting.quality >= 35) {
    lockConfidence = Math.min(100, lockConfidence + 12);
  }

  const lockReady =
    best.colorSignal >= 72 &&
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
  const confirmed = holdDuration >= 1100;
  const status = confirmed ? "sigilLocked" : lockReady ? "holdingSteady" : "signalFound";

  drawCandidateOverlay(context, best.box, lockConfidence, confirmed);

  onResult(smoothScannerResult(createScannerResult({
    title: confirmed ? "Glyph locked" : lockReady ? "Hold steady" : "Signal found",
    message: confirmed
      ? `${best.colorFamily} hollow triangle confirmed.`
      : `${best.colorFamily} hollow triangle found. Center it and hold still.`,
    status,
    colorSignal: best.colorSignal,
    colorFamily: best.colorFamily,
    shape: best.shape,
    symbolMatch: best.shapeMatch,
    lightQuality: lighting.quality,
    frameStability,
    lockConfidence,
    holdProgress: Math.min(100, Math.round(holdDuration / 1100 * 100)),
    confirmed,
    evidenceImage: confirmed ? canvasElement.toDataURL("image/jpeg", 0.72) : null
  })));
}

function createScannerResult(overrides) {
  return {
    title: "Scanner",
    message: "",
    status: "idle",
    colorSignal: 0,
    colorFamily: null,
    shape: null,
    symbolMatch: 0,
    lightQuality: 0,
    frameStability: 0,
    lockConfidence: 0,
    holdProgress: 0,
    confirmed: false,
    evidenceImage: null,
    ...overrides
  };
}

function smoothScannerResult(result) {
  const weight = result.status === "searching" ? 0.35 : 0.48;

  ["colorSignal", "symbolMatch", "lightQuality", "frameStability", "lockConfidence"].forEach((key) => {
    smoothedScannerResult[key] =
      smoothedScannerResult[key] * (1 - weight) + (result[key] || 0) * weight;

    result[key] = Math.round(smoothedScannerResult[key]);
  });

  return result;
}

function estimateSceneLighting(data) {
  let brightnessTotal = 0;
  let usableCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;

    if (brightness > 24 && brightness < 245) {
      brightnessTotal += brightness;
      usableCount += 1;
    }
  }

  if (!usableCount) return { quality: 0 };

  return {
    quality: Math.max(10, Math.min(100, Math.round((brightnessTotal / usableCount) / 170 * 100)))
  };
}

function buildGlyphMask(data, width, height) {
  const mask = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const code = getGlyphColorCode(data[index], data[index + 1], data[index + 2]);

      if (code > 0) {
        mask[y * width + x] = code;
      }
    }
  }

  return mask;
}

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;

  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * (((b - r) / delta) + 2);
    else hue = 60 * (((r - g) / delta) + 4);
  }

  if (hue < 0) hue += 360;

  return {
    hue,
    saturation: max === 0 ? 0 : delta / max,
    value: max
  };
}

function getGlyphColorCode(r, g, b) {
  const hsv = rgbToHsv(r, g, b);

  if (hsv.saturation <= 0.24 || hsv.value <= 0.14) return 0;
  if (hsv.hue < 24 || hsv.hue > 338) return 1;
  if (hsv.hue >= 72 && hsv.hue <= 165) return 2;

  if (
    (hsv.hue >= 270 && hsv.hue <= 337) ||
    (r > 135 && b > 100 && r > g * 1.15 && b > g * 1.05)
  ) {
    return 3;
  }

  if (hsv.hue >= 178 && hsv.hue <= 255) return 4;

  return 0;
}

function getGlyphColorFamily(code) {
  if (code === 2) return "green";
  if (code === 3) return "pink";
  if (code === 4) return "blue";
  return "red";
}

function findGlyphComponents(mask, width, height) {
  const visited = new Uint8Array(width * height);
  const components = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x;

      if (mask[startIndex] === 0 || visited[startIndex]) continue;

      const component = floodFillComponent(x, y, mask[startIndex], mask, visited, width, height);

      if (component.count >= 18) {
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

  while (stack.length) {
    const point = stack.pop();

    if (point.x < 0 || point.x >= width || point.y < 0 || point.y >= height) continue;

    const index = point.y * width + point.x;

    if (visited[index] || mask[index] !== colorCode) continue;

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
    count,
    colorCode,
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
  let best = null;

  components.forEach((component) => {
    const box = component.box;
    const boxArea = box.width * box.height;
    const frameArea = width * height;
    const sizeRatio = boxArea / frameArea;
    const aspect = box.width / Math.max(box.height, 1);
    const density = component.count / Math.max(boxArea, 1);

    if (sizeRatio < 0.002 || sizeRatio > 0.26) return;
    if (box.x <= 1 || box.y <= 1 || box.x + box.width >= width - 1 || box.y + box.height >= height - 1) return;

    const colorSignal = Math.min(100, Math.round(component.count / 150 * 100));
    const hollowScore = calculateHollowCenterScore(box, mask, width);
    const triangleProfile = calculateTriangleProfileScore(box, mask, width);
    const aspectScore = scoreRange(aspect, 0.45, 2.2);
    const densityScore = scoreRange(density, 0.03, 0.42);
    const shape = triangleProfile >= 0.5 ? "hollow-triangle" : "hollow-shape";

    const shapeMatch = Math.round(
      aspectScore * 18 +
      densityScore * 18 +
      hollowScore * 32 +
      triangleProfile * 32
    );

    const candidate = {
      box,
      colorSignal,
      colorFamily: component.colorFamily,
      shape,
      shapeMatch,
      hollowScore: hollowScore * 100,
      total: colorSignal * 0.36 + shapeMatch * 0.64
    };

    if (!best || candidate.total > best.total) {
      best = candidate;
    }
  });

  return best;
}

function scoreRange(value, min, max) {
  if (value >= min && value <= max) return 1;
  if (value < min) return Math.max(0, value / min);
  return Math.max(0, 1 - ((value - max) / max));
}

function calculateHollowCenterScore(box, mask, width) {
  const startX = Math.floor(box.x + box.width * 0.32);
  const endX = Math.floor(box.x + box.width * 0.68);
  const startY = Math.floor(box.y + box.height * 0.32);
  const endY = Math.floor(box.y + box.height * 0.68);

  let centerPixels = 0;
  let markedPixels = 0;

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      centerPixels += 1;
      if (mask[y * width + x] > 0) markedPixels += 1;
    }
  }

  if (!centerPixels) return 0;

  return Math.max(0, Math.min(1, 1 - (markedPixels / centerPixels) * 3));
}

function calculateTriangleProfileScore(box, mask, width) {
  const buckets = new Array(10).fill(0);

  for (let y = box.y; y < box.y + box.height; y += 1) {
    for (let x = box.x; x < box.x + box.width; x += 1) {
      if (mask[y * width + x] > 0) {
        const bucket = Math.min(9, Math.floor((y - box.y) / box.height * 10));
        buckets[bucket] += 1;
      }
    }
  }

  const total = buckets.reduce((sum, value) => sum + value, 0);
  if (!total) return 0;

  const mean = total / buckets.length;
  const variance = buckets.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / buckets.length;
  const variation = Math.sqrt(variance) / Math.max(mean, 1);

  return Math.max(0, Math.min(1, variation / 1.25));
}

function updateStability(box) {
  if (!lastBestBox) {
    stableMarkerFrames = 1;
    lastBestBox = box;
    return;
  }

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const lastCenterX = lastBestBox.x + lastBestBox.width / 2;
  const lastCenterY = lastBestBox.y + lastBestBox.height / 2;
  const movement = Math.hypot(centerX - lastCenterX, centerY - lastCenterY);

  stableMarkerFrames = movement < 24 ? stableMarkerFrames + 1 : 1;
  lastBestBox = box;
}

function drawCandidateOverlay(context, box, confidence, confirmed) {
  context.lineWidth = 3;
  context.strokeStyle = confirmed ? "#74f79b" : "#ffd166";
  context.strokeRect(box.x, box.y, box.width, box.height);
  context.font = "bold 16px Arial";
  context.fillStyle = confirmed ? "#74f79b" : "#ffd166";
  context.fillText(`${confidence}%`, box.x, Math.max(18, box.y - 6));
}