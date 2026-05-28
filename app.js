// --- 1. SETUP 3D HOLOGRAM GRAPHICS (THREE.JS) ---
const container = document.getElementById('three-container');
const scene = new THREE.Scene();
const camera3D = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    wireframe: true,
    transparent: true,
    opacity: 0.8
});
const hologramCube = new THREE.Mesh(geometry, material);
scene.add(hologramCube);

const coreGeo = new THREE.OctahedronGeometry(0.6);
const coreMat = new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true });
const coreMesh = new THREE.Mesh(coreGeo, coreMat);
scene.add(coreMesh);

camera3D.position.z = 5;

let systemMode = "lock"; 
let currentScale = 1.0;

function animate() {
    requestAnimationFrame(animate);
    coreMesh.rotation.x += 0.01;
    coreMesh.rotation.y += 0.01;
    
    if (systemMode === "lock") {
        hologramCube.rotation.y += 0.005;
    }
    renderer.render(scene, camera3D);
}
animate();

// --- 2. FIXED JARVIS VOICE CONTROL ---
const voiceState = document.getElementById('voice-state');
const objStatus = document.getElementById('obj-status');
let isListening = false;

function jarvisSpeak(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1.0;
    speech.pitch = 0.9; 
    window.speechSynthesis.speak(speech);
}

const SpeechEngine = window.webkitSpeechRecognition || window.SpeechRecognition;
if (SpeechEngine) {
    const recognition = new SpeechEngine();
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
        isListening = true;
        voiceState.innerText = "SYSTEM: ONLINE / LISTENING";
    };

    recognition.onresult = (event) => {
        const textResult = event.results[event.results.length - 1].transcript.toLowerCase();

        if (textResult.includes("resize")) {
            systemMode = "resize";
            objStatus.innerText = "RESIZING ACTIVE";
            objStatus.style.color = "#00ff55";
            material.color.setHex(0x00ff55); 
            jarvisSpeak("Adjusting scale.");
        } 
        else if (textResult.includes("rotate")) {
            systemMode = "rotate";
            objStatus.innerText = "ROTATION ACTIVE";
            objStatus.style.color = "#ffaa00";
            material.color.setHex(0xffaa00); 
            jarvisSpeak("Unlocking rotation.");
        } 
        else if (textResult.includes("lock") || textResult.includes("stop")) {
            systemMode = "lock";
            objStatus.innerText = "LOCKED";
            objStatus.style.color = "#00e5ff";
            material.color.setHex(0x00e5ff); 
            jarvisSpeak("Locked.");
        }
    };

    recognition.onerror = (event) => {
        console.log("Speech error caught safely: ", event.error);
    };

    // FIXED: Instead of starting instantly, it waits 1 second to stop the reload bug
    recognition.onend = () => { 
        isListening = false;
        voiceState.innerText = "SYSTEM: PAUSED";
        setTimeout(() => {
            if (!isListening) {
                recognition.start();
            }
        }, 1000); 
    };

    // Initial greeting
    jarvisSpeak("All systems online, Sir.");
    recognition.start();
}

// --- 3. VISION AI SYSTEM ---
const videoElement = document.getElementById('webcam');

function handleHandTracking(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return;

    const handLandmarks = results.multiHandLandmarks[0];
    const thumbTip = handLandmarks[4];
    const indexTip = handLandmarks[8];
    const wrist = handLandmarks[0];

    if (systemMode === "resize") {
        const dx = indexTip.x - thumbTip.x;
        const dy = indexTip.y - thumbTip.y;
        const dz = indexTip.z - thumbTip.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

        let targetScale = distance * 6; 
        currentScale = Math.max(0.3, Math.min(targetScale, 3.5)); 
        hologramCube.scale.set(currentScale, currentScale, currentScale);
    } 
    else if (systemMode === "rotate") {
        hologramCube.rotation.y = (indexTip.x - wrist.x) * 10;
        hologramCube.rotation.x = (indexTip.y - wrist.y) * 10;
    }
}

const handsAI = new Hands({
    locateFile: (file) => `https://unpkg.com{file}`
});

handsAI.setOptions({
    maxNumHands: 1,
    modelComplexity: 0, 
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
handsAI.onResults(handleHandTracking);

const cameraDevice = new Camera(videoElement, {
    onFrame: async () => {
        await handsAI.send({ image: videoElement });
    },
    width: 640,
    height: 480
});
cameraDevice.start();

window.addEventListener('resize', () => {
    camera3D.aspect = window.innerWidth / window.innerHeight;
    camera3D.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
