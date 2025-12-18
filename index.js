// Global variables
let scene, camera, renderer, canvas;
let cube, cubeGroup, plane;
let particleSystem, particleVelocities = [];
let skybox;

// Spectrum texture variables
let spectrumCanvas, spectrumContext;
let spectrumTexture;
let cubeMaterials = [];

// Audio variables
let audioContext, analyser, audioSource, audio;
let dataArray;
let isPlaying = false;

// Mouse control variables
let mouse = { x: 0, y: 0, prevX: 0, prevY: 0, isDown: false };
let cameraRotation = { x: 0, y: 0 };

// Initialize the visualizer
function init() {
    canvas = document.getElementById('visualizer');

    // Three.js setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    camera.position.z = 25;

    setupCanvas();
    setupEventListeners();
    setupMouseControls();
    createSpectrumCanvas();
    createSkybox();

    createPlane();
    createCubeWithSpectrum();
    createParticleSystem();

    animate();
}

// Create skybox with texture
function createSkybox() {
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
        './sky_texture.png',
        (texture) => {
            console.log('Skybox texture loaded successfully');

            scene.background = texture;
            const skyGeometry = new THREE.SphereGeometry(500, 60, 40);
            const skyMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.BackSide
            });

            skybox = new THREE.Mesh(skyGeometry, skyMaterial);
            scene.add(skybox);
        },
        (progress) => {
            console.log('Loading skybox:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
        }
    );
}

// Create canvas for spectrum visualization
function createSpectrumCanvas() {
    spectrumCanvas = document.createElement('canvas');
    spectrumCanvas.width = 512;
    spectrumCanvas.height = 256;
    spectrumContext = spectrumCanvas.getContext('2d');

    spectrumTexture = new THREE.CanvasTexture(spectrumCanvas);
    spectrumTexture.minFilter = THREE.LinearFilter;
    spectrumTexture.magFilter = THREE.LinearFilter;
}

// Setup canvas resize handling
function setupCanvas() {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Setup audio file input and controls
function setupEventListeners() {
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', handleFileSelect);

    const playPauseBtn = document.getElementById('play-pause-btn');
    playPauseBtn.addEventListener('click', togglePlayPause);

    const playSampleBtn = document.getElementById('play-sample-btn');
    playSampleBtn.addEventListener('click', playSampleAudio);
}

// Setup mouse controls for camera
function setupMouseControls() {
    canvas.addEventListener('mousedown', (e) => {
        mouse.isDown = true;
        mouse.prevX = e.clientX;
        mouse.prevY = e.clientY;
    });

    canvas.addEventListener('mouseup', () => {
        mouse.isDown = false;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!mouse.isDown) return;

        const deltaX = e.clientX - mouse.prevX;
        const deltaY = e.clientY - mouse.prevY;

        cameraRotation.y += deltaX * 0.005;
        cameraRotation.x += deltaY * 0.005;

        cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotation.x));

        mouse.prevX = e.clientX;
        mouse.prevY = e.clientY;
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        camera.position.z += e.deltaY * 0.01;
        camera.position.z = Math.max(15, Math.min(50, camera.position.z));
    });
}

// Create Planes
function createPlane() {
    const planeGeometry = new THREE.PlaneGeometry(150, 150);
    const planeMaterial = new THREE.MeshStandardMaterial({
        color: 0x00b3ff,
        metalness: 0.9,
        roughness: 0.1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.2
    });

    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -6;
    plane.receiveShadow = true;
    scene.add(plane);
}

// Create cube with spectrum texture on 4 side faces
function createCubeWithSpectrum() {
    cubeGroup = new THREE.Group();

    const size = 12; 
    const geometry = new THREE.BoxGeometry(size, size, size);

    // Create materials for each face
    // Order: right, left, top, bottom, front, back
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x00b3ff, // default color
        metalness: 0.5,
        roughness: 0.5,
        transparent: true,
        opacity: 0.8
    });

    const spectrumMaterial = new THREE.MeshStandardMaterial({
        map: spectrumTexture,
        metalness: 0.3,
        roughness: 0.4,
        emissive: 0x00b3ff, // side faces color
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
    });

    cubeMaterials = [
        spectrumMaterial.clone(), // right
        spectrumMaterial.clone(), // left
        baseMaterial.clone(),     // top
        baseMaterial.clone(),     // bottom
        spectrumMaterial.clone(), // front
        spectrumMaterial.clone()  // back
    ];

    cube = new THREE.Mesh(geometry, cubeMaterials);
    cube.castShadow = true;
    cube.position.y = 0; // Cube sits on the plane
    cubeGroup.add(cube);

    scene.add(cubeGroup);

    // Add lighting
    const light1 = new THREE.DirectionalLight(0xffffff, 1.2);
    light1.position.set(5, 8, 5);
    light1.castShadow = true;
    light1.shadow.camera.left = -10;
    light1.shadow.camera.right = 10;
    light1.shadow.camera.top = 10;
    light1.shadow.camera.bottom = -10;
    scene.add(light1);

    const light2 = new THREE.PointLight(0x00f3ff, 0.7);
    light2.position.set(-5, 3, -5);
    scene.add(light2);

    const light3 = new THREE.PointLight(0xff00ff, 0.7);
    light3.position.set(5, 3, -5);
    scene.add(light3);

    const light4 = new THREE.PointLight(0xffaa00, 0.5);
    light4.position.set(0, -1, 5);
    scene.add(light4);

    const ambientLight = new THREE.AmbientLight(0x505050, 0.5);
    scene.add(ambientLight);
}

// Draw spectrum on canvas texture
function drawSpectrum() {
    if (!analyser || !dataArray || !spectrumContext) return;

    analyser.getByteFrequencyData(dataArray);

    const width = spectrumCanvas.width;
    const height = spectrumCanvas.height;
    const barCount = 5;
    const barWidth = width / barCount;

    // Clear canvas with black background
    spectrumContext.fillStyle = 'rgb(0, 0, 0)';
    spectrumContext.fillRect(0, 0, width, height);

    // FFT size and sample rate
    const sampleRate = audioContext.sampleRate;
    const frequencyBinSize = sampleRate / analyser.fftSize;

    // Target frequency range: 20-1000Hz
    const minFreq = 20;
    const maxFreq = 1000;
    const minBin = Math.floor(minFreq / frequencyBinSize);
    const maxBin = Math.floor(maxFreq / frequencyBinSize);
    const binRange = maxBin - minBin;

    // Draw spectrum bars
    for (let i = 0; i < barCount; i++) {
        const binIndex = minBin + Math.floor((i / barCount) * binRange);
        const value = dataArray[binIndex];

        const barHeight = (value / 255) * height * 0.9;

        // white color
        spectrumContext.fillStyle = 'rgb(255, 255, 255)';

        // Draw bar from bottom
        const x = i * barWidth;
        const y = height - barHeight;

        spectrumContext.fillRect(x, y, barWidth * 0.9, barHeight);

        // Add white glow effect
        spectrumContext.shadowBlur = 20;
        spectrumContext.shadowColor = 'rgba(255, 255, 255, 0.8)';
        spectrumContext.fillRect(x, y, barWidth * 0.9, barHeight);
        spectrumContext.shadowBlur = 0;
    }
}

// Create particle system floating around the scene
function createParticleSystem() {
    const particleCount = 1000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
        const radius = 12 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta); 
        positions[i * 3 + 2] = radius * Math.cos(phi);

        velocities.push({
            x: (Math.random() - 0.5) * 0.03,
            y: (Math.random() - 0.5) * 0.03,
            z: (Math.random() - 0.5) * 0.03,
            angle: Math.random() * Math.PI * 2,
            radius: radius,
            speed: 0.0002 + Math.random() * 0.0006
        });
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.3,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        map: createGlowTexture(),
        depthWrite: false
    });

    particleSystem = new THREE.Points(particles, particleMaterial);
    particleVelocities = velocities;
    scene.add(particleSystem);
}

// Create glow texture for particles
function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Create smooth radial gradient
    const centerX = 64;
    const centerY = 64;
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 64);

    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.75, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return texture;
}

// Handle audio file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('upload-dialog').classList.add('hidden');
    document.getElementById('audio-controls').classList.add('visible');
    document.getElementById('track-title').textContent = file.name.replace(/\.[^/.]+$/, "");

    if (audio) {
        audio.pause();
        audio = null;
    }

    audio = new Audio();
    audio.src = URL.createObjectURL(file);

    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        audioSource = audioContext.createMediaElementSource(audio);
        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);
    }

    dataArray = new Uint8Array(analyser.frequencyBinCount);

    audio.addEventListener('loadedmetadata', () => {
        document.getElementById('total-time').textContent = formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
        updateProgress();
    });

    audio.addEventListener('ended', () => {
        handleAudioEnd();
    });

    audio.play();
    isPlaying = true;
    updatePlayPauseButton();
}

// Play sample audio (River.wav)
function playSampleAudio() {
    document.getElementById('upload-dialog').classList.add('hidden');
    document.getElementById('audio-controls').classList.add('visible');
    document.getElementById('track-title').textContent = 'River (Sample)';

    if (audio) {
        audio.pause();
        audio = null;
    }

    audio = new Audio();
    audio.src = './River.wav';

    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        audioSource = audioContext.createMediaElementSource(audio);
        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);
    }

    dataArray = new Uint8Array(analyser.frequencyBinCount);

    audio.addEventListener('loadedmetadata', () => {
        document.getElementById('total-time').textContent = formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
        updateProgress();
    });

    audio.addEventListener('ended', () => {
        handleAudioEnd();
    });

    audio.play();
    isPlaying = true;
    updatePlayPauseButton();
}

// Toggle play/pause
function togglePlayPause() {
    if (!audio) return;

    if (isPlaying) {
        audio.pause();
    } else {
        audio.play();
    }

    isPlaying = !isPlaying;
    updatePlayPauseButton();
}

// Update play/pause button
function updatePlayPauseButton() {
    const btn = document.getElementById('play-pause-btn');
    btn.textContent = isPlaying ? 'Pause' : 'Play';
}

// Update progress display
function updateProgress() {
    if (!audio) return;
    document.getElementById('current-time').textContent = formatTime(audio.currentTime);
}

// Format time display
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Handle audio end
function handleAudioEnd() {
    isPlaying = false;
    updatePlayPauseButton();

    if (audio) {
        audio.pause();
        audio = null;
    }

    document.getElementById('audio-controls').classList.remove('visible');
    document.getElementById('upload-dialog').classList.remove('hidden');
    document.getElementById('file-input').value = '';
}

// Update spectrum texture
function updateSpectrumTexture() {
    if (!isPlaying) return;

    drawSpectrum();
    spectrumTexture.needsUpdate = true;

    // Update materials to keep them synchronized
    cubeMaterials.forEach((material, index) => {
        // Skip top and bottom faces (indices 2 and 3)
        if (index !== 2 && index !== 3 && material.map) {
            material.needsUpdate = true;
        }
    });
}

// Update particle system based on audio
function updateParticles() {
    if (!particleSystem || !analyser || !dataArray) return;

    analyser.getByteFrequencyData(dataArray);
    const positions = particleSystem.geometry.attributes.position.array;

    // Get bass frequencies (20-1000Hz range, same as spectrum)
    const sampleRate = audioContext.sampleRate;
    const frequencyBinSize = sampleRate / analyser.fftSize;
    const minBin = Math.floor(20 / frequencyBinSize);
    const maxBin = Math.floor(1000 / frequencyBinSize);

    let bassSum = 0;
    for (let i = minBin; i <= maxBin; i++) {
        bassSum += dataArray[i];
    }
    const bassLevel = bassSum / (maxBin - minBin + 1) / 255;

    // Update particle glow based on bass (20-1000Hz)
    const glowIntensity = 0.4 + bassLevel * 0.6;
    particleSystem.material.opacity = glowIntensity;
    particleSystem.material.size = 0.4 + bassLevel * 0.5;

    for (let i = 0; i < particleVelocities.length; i++) {
        const vel = particleVelocities[i];

        // Orbital motion around the cube in larger space with vertical movement
        vel.angle += vel.speed;

        const x = vel.radius * Math.sin(vel.angle) * Math.cos(i * 0.03);
        const y = Math.sin(vel.angle * 1.2 + i * 0.08) * 20; // Increased vertical range
        const z = vel.radius * Math.cos(vel.angle) * Math.sin(i * 0.03);

        // Add slow drift
        positions[i * 3] = x + vel.x;
        positions[i * 3 + 1] = y + vel.y;
        positions[i * 3 + 2] = z + vel.z;

        vel.x += (Math.random() - 0.5) * 0.008;
        vel.y += (Math.random() - 0.5) * 0.008;
        vel.z += (Math.random() - 0.5) * 0.008;

        // Limit drift in larger space
        vel.x = Math.max(-3, Math.min(3, vel.x));
        vel.y = Math.max(-3, Math.min(3, vel.y));
        vel.z = Math.max(-3, Math.min(3, vel.z));
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update camera position based on rotation
    const radius = camera.position.length();
    camera.position.x = radius * Math.sin(cameraRotation.y) * Math.cos(cameraRotation.x);
    camera.position.y = radius * Math.sin(cameraRotation.x);
    camera.position.z = radius * Math.cos(cameraRotation.y) * Math.cos(cameraRotation.x);
    camera.lookAt(0, 0, 0);

    // Update spectrum texture and particles if playing
    if (isPlaying) {
        updateSpectrumTexture();
        updateParticles();
    }

    renderer.render(scene, camera);
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    init();
});
