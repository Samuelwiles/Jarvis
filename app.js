// --- 1. SETUP 3D HOLOGRAM GRAPHICS (THREE.JS) ---
const container = document.getElementById('three-container');
const scene = new THREE.Scene();
const camera3D = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Create a futuristic glowing wireframe cube
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    wireframe: true,
    transparent: true,
    opacity: 0.8
});
const hologramCube = new THREE.Mesh(geometry, material);
scene.add(hologramCube);

// Add an inner core object
const coreGeo = new THREE.OctahedronGeometry(0.6);
const coreMat = new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true });
const coreMesh = new THREE.Mesh(coreGeo, coreMat);
scene.add(coreMesh);

camera3D.position.z = 5;

// System states
let systemMode = "lock"; // modes: lock, resize, rotate
let currentScale = 1.0;

// Render loop
function animate() {
    requestAnimationFrame(animate);
    // Constantly spin the core slowly
    coreMesh.rotation.x += 0.01;
    coreMesh.rotation.y += 0.01;
    
    // Default idle spin for the main cube if locked
    if (systemMode === "lock") {
        hologramCube.rotation.y += 0.005;
    }
    renderer.render(scene, camera3D);
}
animate();

// --- 2. JARVIS VOICE CONTROL ---
const voiceState = document.getElementById('voice-state');
const objStatus = document.getElementById('obj-status');

function jarvisSpeak(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1.0;
    speech.pitch = 0.9; // Slightly deeper robotic voice
    window.speechSynthesis.speak(speech);
}

const SpeechEngine = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechEngine) {
    const recognition = new SpeechEngine();
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
        voiceState.innerText = "SYSTEM: ONLINE / LISTENING";
        jarvisSpeak("All systems online. Ready for your command, Sir.");
    };

    recognition.onresult = (event) => {
        const textResult = event.results[event.results.length - 1].transcript.toLowerCase();
        console.log("JARVIS Heard: ", textResult);

        if (textResult.includes("resize")) {
            systemMode = "resize";
            objStatus.innerText = "RESIZING ACTIVE";
            objStatus.style.color = "#00ff55";
            material.color.setHex(0x00ff55); // Change hologram to green
            jarvisSpeak("Control granted. Adjusting object scale.");
        } 
        else if (textResult.includes("rotate")) {
            systemMode = "rotate";
            objStatus.innerText = "ROTATION ACTIVE";
            objStatus.style.color = "#ffaa00";
            material.color.setHex(0xffaa00); // Change hologram to orange
            jarvisSpeak("Rotation matrix unlocked. Move your hand to spin.");
        } 
        else if (textResult.includes("lock") || textResult.includes("stop")) {
            systemMode = "lock";
            objStatus.innerText = "LOCKED";
            objStatus.style.color = "#00e5ff";
            material.color.setHex(0x00e5ff); // Reset to neon blue
            jarvisSpeak("Locking parameters, Sir.");
        }
    };

    // Keep voice engine alive if it disconnects
    recognition.onend = () => { recognition.start(); };
    recognition.start();
}

// --- 3. ADVANCED VISION AI (MEDIAPIPE) ---
const videoElement = document.getElementById('webcam');

function handleHandTracking(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return;

    const handLandmarks = results.multiHandLandmarks[0];

    // Get specific finger points
    const thumbTip = handLandmarks[4];
    const indexTip = handLandmarks[8];
    const wrist = handLandmarks[0];

    if (systemMode === "resize") {
        // Calculate 3D space straight-line distance between thumb and index finger
        const dx = indexTip.x - thumbTip.x;
        const dy = indexTip.y - thumbTip.y;
        const dz = indexTip.z - thumbTip.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

        // Map the distance to a clear 3D scale scale
        let targetScale = distance * 6; 
        currentScale = Math.max(0.3, Math.min(targetScale, 3.5)); // Clamp values safely
        
        hologramCube.scale.set(currentScale, currentScale, currentScale);
    } 
    else if (systemMode === "rotate") {
        // Use the index finger tip position relative to the wrist to turn the object
        hologramCube.rotation.y = (indexTip.x - wrist.x) * 10;
        hologramCube.rotation.x = (indexTip.y - wrist.y) * 10;
    }
}

const handsAI = new Hands({
    locateFile: (file) => `https://jsdelivr.net{file}`
});

handsAI.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});
handsAI.onResults(handleHandTracking);

// Active advanced web camera stream
const cameraDevice = new Camera(videoElement, {
    onFrame: async () => {
        await handsAI.send({ image: videoElement });
    },
    width: 640,
    height: 480
});
cameraDevice.start();

// Handle window resizing safely
window.addEventListener('resize', () => {
    camera3D.aspect = window.innerWidth / window.innerHeight;
    camera3D.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

