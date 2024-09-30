import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

class MapEditor {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = null;
        this.mouse = null;
        this.currentLayer = 0;
        this.currentAsset = null;
        this.assets = {};
        this.placedObjects = [];
        this.isPlacingCube = false;

        this.init();
    }

    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLights();
        this.setupControls();
        this.setupHelpers();
        this.setupRaycaster();

        this.loadAssets();
        this.createUI();

        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('click', (event) => this.onCanvasClick(event));

        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(10, 10, 20);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#canvas') });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setupLights() {
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        this.scene.add(light);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
    }

    setupHelpers() {
        const gridHelper = new THREE.GridHelper(20, 20);
        this.scene.add(gridHelper);
    }

    setupRaycaster() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    loadAssets() {
        const loader = new GLTFLoader();
        const assetUrls = {
            'pikachu': 'https://example.com/pikachu.glb',
            'eevee': 'https://example.com/eevee.glb',
        };

        for (const [name, url] of Object.entries(assetUrls)) {
            loader.load(url, (gltf) => {
                this.assets[name] = gltf.scene;
                this.createAssetButton(name);
            });
        }
    }

    createUI() {
        document.getElementById('layerSelect').addEventListener('change', (e) => {
            this.currentLayer = parseInt(e.target.value);
        });

        document.getElementById('saveBtn').addEventListener('click', () => this.saveMap());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadMap());
        document.getElementById('cubePlacerBtn').addEventListener('click', () => this.toggleCubePlacement());
    }

    createAssetButton(assetName) {
        const button = document.createElement('button');
        button.textContent = assetName;
        button.onclick = () => this.selectAsset(assetName);
        document.getElementById('assetButtons').appendChild(button);
    }

    selectAsset(assetName) {
        this.currentAsset = assetName;
        this.isPlacingCube = false;
        document.getElementById('cubePlacerBtn').style.backgroundColor = '';
    }

    toggleCubePlacement() {
        this.isPlacingCube = !this.isPlacingCube;
        document.getElementById('cubePlacerBtn').style.backgroundColor = this.isPlacingCube ? '#4CAF50' : '';
        this.currentAsset = null;
    }

    onCanvasClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            if (this.isPlacingCube) {
                this.placeCube(intersect.point);
            } else if (this.currentAsset) {
                this.placeAsset(intersect.point);
            }
        }
    }

    placeCube(position) {
        const size = 1;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);

        cube.position.set(
            Math.round(position.x),
            this.currentLayer,
            Math.round(position.z)
        );

        this.scene.add(cube);

        this.placedObjects.push({
            object: cube,
            layer: this.currentLayer,
            assetName: 'cube'
        });
    }

    placeAsset(position) {
        if (!this.currentAsset) return;

        const asset = this.assets[this.currentAsset].clone();
        asset.position.copy(position);
        asset.position.y = this.currentLayer;
        this.scene.add(asset);

        this.placedObjects.push({
            object: asset,
            layer: this.currentLayer,
            assetName: this.currentAsset
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    saveMap() {
        const mapData = this.placedObjects.map(obj => ({
            assetName: obj.assetName,
            position: obj.object.position.toArray(),
            layer: obj.layer
        }));
        localStorage.setItem('mapData', JSON.stringify(mapData));
        alert('Map sauvegardée!');
    }

    loadMap() {
        const mapData = JSON.parse(localStorage.getItem('mapData'));
        if (!mapData) {
            alert('Aucune map sauvegardée!');
            return;
        }

        this.placedObjects.forEach(obj => this.scene.remove(obj.object));
        this.placedObjects = [];

        mapData.forEach(objData => {
            if (objData.assetName === 'cube') {
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
                const cube = new THREE.Mesh(geometry, material);
                cube.position.fromArray(objData.position);
                this.scene.add(cube);
                this.placedObjects.push({
                    object: cube,
                    layer: objData.layer,
                    assetName: 'cube'
                });
            } else {
                const asset = this.assets[objData.assetName].clone();
                asset.position.fromArray(objData.position);
                this.scene.add(asset);
                this.placedObjects.push({
                    object: asset,
                    layer: objData.layer,
                    assetName: objData.assetName
                });
            }
        });
    }
}

// Initialisation de l'application
const mapEditor = new MapEditor();