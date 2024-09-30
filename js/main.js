import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

let scene, camera, renderer, controls;
let raycaster, mouse;
let currentLayer = 0;
let currentAsset = null;
let assets = {};
let placedObjects = [];

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 10, 20);

    renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#canvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const gridHelper = new THREE.GridHelper(20, 20);
    scene.add(gridHelper);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onCanvasClick);

    loadAssets();
    createUI();
    animate();
}

function loadAssets() {
    const loader = new GLTFLoader();
    // Exemple d'assets (à remplacer par vos propres modèles)
    const assetUrls = {
        'pikachu': 'https://example.com/pikachu.glb',
        'eevee': 'https://example.com/eevee.glb',
    };

    for (const [name, url] of Object.entries(assetUrls)) {
        loader.load(url, (gltf) => {
            assets[name] = gltf.scene;
            createAssetButton(name);
        });
    }
}

function createUI() {
    document.getElementById('layerSelect').addEventListener('change', (e) => {
        currentLayer = parseInt(e.target.value);
    });

    document.getElementById('saveBtn').addEventListener('click', saveMap);
    document.getElementById('loadBtn').addEventListener('click', loadMap);
}

function createAssetButton(assetName) {
    const button = document.createElement('button');
    button.textContent = assetName;
    button.onclick = () => selectAsset(assetName);
    document.getElementById('assetButtons').appendChild(button);
}

function selectAsset(assetName) {
    currentAsset = assetName;
}

function onCanvasClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        placeAsset(intersect.point);
    }
}

function placeAsset(position) {
    if (!currentAsset) return;

    const asset = assets[currentAsset].clone();
    asset.position.copy(position);
    asset.position.y = currentLayer;
    scene.add(asset);

    placedObjects.push({
        object: asset,
        layer: currentLayer,
        assetName: currentAsset
    });
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function saveMap() {
    const mapData = placedObjects.map(obj => ({
        assetName: obj.assetName,
        position: obj.object.position.toArray(),
        layer: obj.layer
    }));
    localStorage.setItem('mapData', JSON.stringify(mapData));
    alert('Map sauvegardée!');
}

function loadMap() {
    const mapData = JSON.parse(localStorage.getItem('mapData'));
    if (!mapData) {
        alert('Aucune map sauvegardée!');
        return;
    }

    // Nettoyer la scène
    placedObjects.forEach(obj => scene.remove(obj.object));
    placedObjects = [];

    // Recharger les objets
    mapData.forEach(objData => {
        const asset = assets[objData.assetName].clone();
        asset.position.fromArray(objData.position);
        scene.add(asset);
        placedObjects.push({
            object: asset,
            layer: objData.layer,
            assetName: objData.assetName
        });
    });
}

init();