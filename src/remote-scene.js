import Stats from 'three/examples/jsm/libs/stats.module.js';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
// import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';

import { Experiments, RenderingMedium, DefaultLatency } from './constants';

AFRAME.registerComponent('remote-scene', {
    schema: {
        fps: {type: 'number', default: 90},
        latency: {type: 'number', default: DefaultLatency}, // ms
        numLights: {type: 'number', default: 3},
        numModels: {type: 'number', default: 8},
        reset: {type: 'boolean'},
    },

    init: async function() {
        const el = this.el;
        const data = this.data;

        const sceneEl = el;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.stats = new Stats();
        this.stats.showPanel(0);
        document.getElementById('remote-stats').appendChild(this.stats.dom);
        this.stats.dom.style.top = '50px';

        this.experimentManager = sceneEl.systems['experiment-manager'];
        this.remoteLocal = sceneEl.systems['remote-local'];

        this.remoteScene = sceneEl.systems['remote-local'].remoteScene;
        this.remoteCamera = sceneEl.systems['remote-local'].remoteCamera;

        this.localScene = sceneEl.object3D;
        this.localCamera = sceneEl.camera;

        // This is the remote scene init //
        const scene = this.remoteScene;
        const camera = this.remoteCamera;

        const _this = this;

        this.elapsed = 0;
        this.clock = new THREE.Clock();

        scene.background = new THREE.Color(0x87CEEB);

        const textureLoader = new THREE.TextureLoader();
        const gltfLoader = new GLTFLoader();

        const sphereGeometry = new THREE.SphereGeometry( 0.3, 32, 16 );
        const sphereMaterial = new THREE.MeshBasicMaterial( { color: 0xDDDDFF } );

        let j = 0;
        let sphere, light;
        for (var i = -Math.floor(data.numLights / 2); i < Math.ceil(data.numLights / 2); i++) {
            let xPos = i;
            if (data.numLights % 2 == 0) xPos += 0.5;

            sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.set( 15 * xPos, 10, -3 );
            this.addToScene( `light${j++}`, sphere );
            sphere.userData.originalMedium = RenderingMedium.Remote;

            light = new THREE.SpotLight( 0xDDDDFF, 2 );
            light.castShadow = true;
            light.shadow.bias = -0.0001;
            light.shadow.mapSize.width = 1024 * 4;
            light.shadow.mapSize.height = 1024 * 4;
            light.shadow.camera.near = 10;
            light.shadow.camera.far = 1000;
            light.shadow.camera.fov = 30;
            sphere.add( light );
        }

        const boxMaterial = new THREE.MeshBasicMaterial( { color: 0x7074FF } );
        const boxGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        this.box = new THREE.Mesh(boxGeometry, boxMaterial);
        this.box.position.set(0.75, 1.1, -1);
        this.box.castShadow = true;
        this.box.receiveShadow = true;
        this.addToScene( 'blueBox', this.box ); // add to remote scene
        this.box.userData.originalMedium = RenderingMedium.Remote;
        this.box.userData.grabbable = true;

        // new EXRLoader()
        //     .setPath( 'assets/textures/' )
        //     .load( 'starmap_2020_4k_gal.exr', function( texture ) {
        //         texture.mapping = THREE.EquirectangularReflectionMapping;
        //         scene.background = texture;
        //         scene.environment = texture;
        //         _this.experimentManager.objects['background'] = texture;
        //         texture.userData.originalMedium = RenderingMedium.Remote;
        //     } );

        new RGBELoader()
            .setPath( 'assets/textures/' )
            .load( 'farm_field_puresky_1k.hdr', function( texture ) {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                scene.background = texture;
                scene.environment = texture;
                _this.experimentManager.objects['background'] = texture;
                texture.userData.originalMedium = RenderingMedium.Remote;
            } );

        textureLoader
            .setPath( 'assets/textures/' )
            .load( 'height_map.png' , function( texture ) {
                texture.wrapS = texture.wrapT = THREE.Repeatwrapping;
                texture.repeat.set(1, 1);

                textureLoader.load('park_dirt_diff_1k.png', function( groundTexture ) {
                    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
                    groundTexture.anisotropy = 16;
                    groundTexture.encoding = THREE.sRGBEncoding;
                    groundTexture.repeat.set(32, 32);

                    const groundMaterial = new THREE.MeshStandardMaterial({
                        map: groundTexture,
                        // wireframe: true,
                        displacementMap: texture,
                        displacementScale: 5,
                    });

                    const groundGeometry = new THREE.PlaneGeometry(120, 120, 5, 5);
                    groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
                    groundMesh.receiveShadow = true;
                    groundMesh.rotation.x = -Math.PI / 2;
                    groundMesh.position.y = -3;
                    _this.addToScene( 'groundMesh', groundMesh );
                    groundMesh.userData.originalMedium = RenderingMedium.Remote;
                } );
            } );

        var model;
        gltfLoader
            .setPath( 'assets/models/DamagedHelmet/glTF/' )
            .load( 'DamagedHelmet.gltf', function( gltf ) {
                model = gltf.scene;
                model.scale.set(0.27, 0.27, 0.27);
                model.position.set(-0.75, 1.1, -1);
                model.traverse( function( node ) {
                    if ( node.isMesh ) { node.castShadow = true; node.receiveShadow = true; }
                } );
                _this.addToScene( 'helmet', model );
                model.userData.originalMedium = RenderingMedium.Remote;
            } );

        // gltfLoader
        //     .setPath( 'assets/models/' )
        //     .load( 'sword.glb', function( gltf ) {
        //         model = gltf.scene;
        //         model.scale.set(0.25, 0.25, 0.25);
        //         model.position.set(0.75, 1.5, -1);
        //         model.rotation.y += Math.PI / 2;
        //         model.traverse( function( node ) {
        //             if ( node.isMesh ) { node.castShadow = true; node.receiveShadow = true; node.userData.grabbable = true; }
        //         } );
        //         _this.addToScene( 'swordRight', model );
        //         model.userData.originalMedium = RenderingMedium.Remote;
        //     } );

        function modelLoader(path) {
            gltfLoader.setPath( 'assets/models/' );
            return new Promise((resolve, reject) => {
                gltfLoader.load(path, data => resolve(data), null, reject);
            });
        }

        const lowResModel = await modelLoader( 'golden_knight_1kTX_low_poly.glb' );
        const highResModel = await modelLoader( 'golden_knight_1kTX_high_poly.glb' );
        const models = [lowResModel.scene, highResModel.scene];

        for (var i = 0; i < data.numModels; i++) {
            for (var m = 0; m < 2; m++) {
                model = models[m].clone();
                model.scale.set(2.5, 2.5, 2.5);
                model.position.x = 5 * Math.cos((Math.PI / (data.numModels - 1)) * i);
                model.position.y = -0.1;
                model.position.z = -5 * Math.sin((Math.PI / (data.numModels - 1)) * i);
                model.rotation.y = (Math.PI / (data.numModels - 1)) * i - Math.PI / 2;
                model.traverse( function( node ) {
                    if ( node.isMesh ) { node.castShadow = true; node.receiveShadow = true; }
                } );
                if (m == 0) {
                    _this.addToScene( `modelLow${i}`, model );
                    model.userData.originalMedium = 'local';
                    model.visible = false;
                } else {
                    _this.addToScene( `modelHigh${i}`, model );
                    model.userData.originalMedium = RenderingMedium.Remote;
                    model.visible = true;
                }
            }
        }

        this.experimentManager.changeExperiment(Experiments.LowPolyLocal);
    },

    addToScene(objectId, object) {
        const scene = this.remoteScene;
        const camera = this.remoteCamera;

        scene.add(object);
        object.traverse( function( node ) {
            if ( node.isMesh ) {
                node.userData.renderingMedium = RenderingMedium.Remote;
            }
        } );
        object.userData.renderingMedium = RenderingMedium.Remote;
        this.experimentManager.objects[objectId] = object;
    },

    update(oldData) {
        const data = this.data;

        if (data.fps != oldData.fps) {
            this.remoteLocal.updateFPS(data.fps);
        }

        if (data.latency != oldData.latency) {
            this.remoteLocal.setLatency(data.latency);
        }

        if (data.reset) {
            this.experimentManager.objects['blueBox'].position.set(0.75, 1.1, -1);
        }
    },

    tick: function(dt) {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;

        const scene = this.remoteScene;
        const camera = this.remoteCamera;

        const duration = 2500;
        const scaleFactor = 1.1;

        this.elapsed += this.clock.getDelta() * 1000;
        if (this.elapsed > 1000 / data.fps) {
            this.elapsed = 0;
            this.stats.update();

            if (this.experimentManager.objects['helmet']) {
                this.experimentManager.objects['helmet'].rotation.y += 0.01 * 60 / data.fps;
            }

            for (var i = 0; i < data.numModels; i++) {
                if (this.experimentManager.objects[`modelLow${i}`] === undefined ||
                    this.experimentManager.objects[`modelHigh${i}`] === undefined) continue;

                const origModelScale = new THREE.Vector3(2.5, 2.5, 2.5);
                const scale = origModelScale.multiplyScalar(1 + (Math.sin(dt / duration * Math.PI * 2) * 0.5 + 0.5) * (scaleFactor - 1));

                this.experimentManager.objects[`modelLow${i}`].scale.copy(scale);
                this.experimentManager.objects[`modelHigh${i}`].scale.copy(scale);
            }
        }
    }
});
