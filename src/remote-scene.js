import Stats from 'three/examples/jsm/libs/stats.module.js';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';

import { Experiments, RenderingMedium, DefaultLatency } from './constants';

AFRAME.registerComponent('remote-scene', {
    schema: {
        fps: {type: 'number', default: 90},
        latency: {type: 'number', default: DefaultLatency}, // ms
        numLights: {type: 'number', default: 2},
        numModels: {type: 'number', default: 4},
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

        const gltfLoader = new GLTFLoader();

        function modelLoader(path, modelName) {
            gltfLoader.setPath( path );
            return new Promise((resolve, reject) => {
                gltfLoader.load(modelName, data => resolve(data), null, reject);
            });
        }

        const sphereGeometry = new THREE.SphereGeometry( 0.1, 32, 16 );
        const sphereMaterial = new THREE.MeshBasicMaterial( { color: 0xDDDDFF } );

        let j = 0;
        let sphere, light;
        for (var i = -Math.floor(data.numLights / 2); i < Math.ceil(data.numLights / 2); i++) {
            let xPos = i;
            if (data.numLights % 2 == 0) xPos += 0.5;

            sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.set( 10 * xPos, 9, 2 );
            this.addToScene( `light${j++}`, sphere );
            sphere.userData.originalMedium = RenderingMedium.Remote;

            light = new THREE.SpotLight( 0xDDDDFF, 1 );
            light.castShadow = true;
            light.shadow.bias = -0.0001;
            light.shadow.mapSize.width = 1024 * 4;
            light.shadow.mapSize.height = 1024 * 4;
            light.shadow.camera.near = 10;
            light.shadow.camera.far = 1000;
            light.shadow.camera.fov = 30;
            sphere.add( light );
        }

        const boxMaterial = new THREE.MeshStandardMaterial( { color: 0x7074FF } );
        const boxGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        this.box = new THREE.Mesh(boxGeometry, boxMaterial);
        this.box.position.set(0.75, 1.1, -1);
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

        var model;
        model = await modelLoader( 'assets/models/DamagedHelmet/glTF/', 'DamagedHelmet.gltf' );
        const helmet = model.scene;
        helmet.scale.set(0.27, 0.27, 0.27);
        helmet.position.set(-0.75, 1.1, -1);
        helmet.userData.originalMedium = RenderingMedium.Remote;
        _this.addToScene( 'helmet', helmet );
        _this.helmet = helmet;

        var models;

        const lowResSponza = await modelLoader( 'assets/models/', 'sponza_high_poly.glb' );
        const highResSponza = await modelLoader( 'assets/models/', 'sponza_low_poly.glb' );
        models = [highResSponza.scene, lowResSponza.scene]
        for (var m = 0; m < 2; m++) {
            model = models[m];
            model.scale.set(3, 3, 3);
            model.position.set(0.7, -0.2, 17);
            model.rotation.set(0, Math.PI/2, 0);
            if (m == 0) {
                model.visible = false;
                model.userData.originalMedium = RenderingMedium.Local;
                _this.addToScene( 'sponza-modelLow', model );
            }
            else {
                model.visible = true;
                model.userData.originalMedium = RenderingMedium.Remote;
                _this.addToScene( 'sponza-modelHigh', model );
            }
        }

        const lowResKnight = await modelLoader( 'assets/models/', 'golden_knight_1kTX_low_poly.glb' );
        const highResKnight = await modelLoader( 'assets/models/', 'golden_knight_1kTX_high_poly.glb' );
        models = [lowResKnight.scene, highResKnight.scene];
        for (var i = 0; i < data.numModels; i++) {
            for (var m = 0; m < 2; m++) {
                model = models[m].clone();
                model.position.x = 4 * Math.cos((Math.PI / (data.numModels - 1)) * i);
                model.position.y = -0.25;
                model.position.z = -4 * Math.sin((Math.PI / (data.numModels - 1)) * i);
                model.rotation.y = (Math.PI / (data.numModels - 1)) * i - Math.PI / 2;
                if (m == 0) {
                    model.visible = false;
                    model.userData.originalMedium = RenderingMedium.Local;
                    _this.addToScene( `knight-modelLow${i}`, model );
                } else {
                    model.visible = true;
                    model.userData.originalMedium = RenderingMedium.Remote;
                    _this.addToScene( `knight-modelHigh${i}`, model );
                }
            }
        }

        this.experimentManager.changeExperiment(Experiments.LowPolyLocal);
    },

    addToScene: function(objectId, object) {
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

    update: function(oldData) {
        const data = this.data;

        if (data.fps !== oldData.fps) {
            this.remoteLocal.updateFPS(data.fps);
        }

        if (data.latency !== oldData.latency) {
            this.remoteLocal.setLatency(data.latency);
        }
    },

    reset: function() {
        if (this.box) {
            this.box.position.set(0.75, 1.1, -1);
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
        if (this.experimentManager.experiment === Experiments.LowPolyLocal ||
            this.elapsed > 1000 / data.fps) {
            this.elapsed = 0;
            this.stats.update();

            if (this.helmet) {
                if (this.experimentManager.experiment !== Experiments.LowPolyLocal) {
                    this.helmet.rotation.y += 0.01 * 60 / data.fps;
                }
                else {
                    this.helmet.rotation.y += 0.01 * 60 / 90;
                }
            }

            for (var i = 0; i < data.numModels; i++) {
                if (this.experimentManager.objects[`knight-modelLow${i}`] === undefined ||
                    this.experimentManager.objects[`knight-modelHigh${i}`] === undefined) continue;

                const origModelScale = new THREE.Vector3(1.6, 1.6, 1.6);
                const scale = origModelScale.multiplyScalar(1 + (Math.sin(dt / duration * Math.PI * 2) * 0.5 + 0.5) * (scaleFactor - 1));

                this.experimentManager.objects[`knight-modelLow${i}`].scale.copy(scale);
                this.experimentManager.objects[`knight-modelHigh${i}`].scale.copy(scale);
            }
        }
    }
});
