import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier';

AFRAME.registerComponent('remote-scene', {
    schema: {
        fps: {type: 'number', default: 60},
        latency: {type: 'number', default: 150}, // ms
    },

    init: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = el;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.remoteLocal = sceneEl.systems['remote-local'];

        this.remoteScene = sceneEl.systems['remote-local'].remoteScene;
        this.remoteCamera = sceneEl.systems['remote-local'].remoteCamera;

        // This is the remote scene init //
        const scene = this.remoteScene;
        const camera = this.remoteCamera;

        const _this = this;

        scene.userData.objects = {};

        // scene.background = new THREE.Color(0xF06565);
        const textureLoader = new THREE.TextureLoader();
        const gltfLoader = new GLTFLoader();

        const boxMaterial = new THREE.MeshBasicMaterial( { color: 0x7074FF } );
        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

        const NUM_LIGHTS = 6;
        let j = 0;
        for (var i = -Math.floor(NUM_LIGHTS / 2); i < Math.floor(NUM_LIGHTS / 2); i++) {
            const light = new THREE.DirectionalLight( 0xAAAAFF, 1 );
            light.position.set( 5*i, 10, 0 );
            light.castShadow = true;
            _this.addToScene( `light${j++}`, light );
            light.userData.originalMedium = 'remote';

            // const box = new THREE.Mesh(boxGeometry, boxMaterial);
            // box.position.set( 5*i, 10, 0 );
            // _this.addToScene( `box${j++}`, box );
            // box.userData.originalMedium = 'remote';
        }

        this.box = new THREE.Mesh(boxGeometry, boxMaterial);
        this.box.position.set(2, 1.6, -5);
        this.box.castShadow = true;
        this.box.receiveShadow = true;
        _this.addToScene( 'blueBox', this.box ); // add to remote scene
        this.box.userData.originalMedium = 'remote';

        // new EXRLoader()
        //     .setPath( 'assets/textures/' )
        //     .load( 'farm_field_puresky_4k.exr', function ( texture ) {
        //         texture.mapping = THREE.EquirectangularReflectionMapping;
        //         scene.background = texture;
        //         scene.environment = texture;
        //     } );

        new RGBELoader()
            .setPath( 'assets/textures/' )
            .load( 'farm_field_puresky_4k.hdr', function ( texture ) {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                scene.background = texture;
                scene.environment = texture;
                scene.userData.objects['background'] = texture;
                texture.userData.originalMedium = 'remote';
            } );

        textureLoader
            .setPath( 'assets/textures/' )
            .load( 'height_map.png' , function ( texture ) {
                texture.wrapS = texture.wrapT = THREE.Repeatwrapping;
                texture.repeat.set(1, 1);

                textureLoader.load('park_dirt_diff_1k.png', function ( groundTexture ) {
                    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
                    groundTexture.anisotropy = 16;
                    groundTexture.encoding = THREE.sRGBEncoding;
                    texture.repeat.set(32, 32);

                    const groundMaterial = new THREE.MeshStandardMaterial({
                        map: groundTexture,
                        // wireframe: true,
                        displacementMap: texture,
                        displacementScale: 5,
                    });

                    const groundGeometry = new THREE.PlaneGeometry(120, 120, 10, 10);
                    groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
                    groundMesh.receiveShadow = true;
                    groundMesh.rotation.x = -Math.PI / 2;
                    groundMesh.position.y = -5;
                    _this.addToScene( 'groundMesh', groundMesh );
                    groundMesh.userData.originalMedium = 'remote';
                } );
            } );

        gltfLoader
            .setPath( 'assets/models/DamagedHelmet/glTF/' )
            .load( 'DamagedHelmet.gltf', function ( gltf ) {
                const model = gltf.scene;
                model.scale.set(1, 1, 1);
                model.position.set(-2, 1.6, -5);
                model.castShadow = true;
                model.receiveShadow = true;
                _this.addToScene( 'helmet', model );
                model.userData.originalMedium = 'remote';
            } );

        gltfLoader
            .setPath( 'assets/models/' )
            .load( 'sword.glb', function ( gltf ) {
                const model = gltf.scene;
                model.scale.set(0.03, 0.03, 0.03);
                model.position.set(2, 1.6, -5);
                model.castShadow = true;
                model.receiveShadow = true;
                _this.addToScene( 'swordRight', model );
                model.userData.originalMedium = 'remote';
            } );

        const NUM_MODELS = 20;
        gltfLoader
            // .setPath( '' )
            // .load( 'https://dl.dropboxusercontent.com/s/p0cxjnps8w9g4vm/pine_tree.glb', function ( gltf ) {
            // .load( 'les_bourgeois_de_calais_by_rodin.glb', function ( gltf ) {
            .load( 'les_bourgeois_de_calais_by_rodin_low.glb', function ( gltf ) {
                const model = gltf.scene;
                for (var i = 0; i < NUM_MODELS; i++) {
                    const modelClone = model.clone();
                    modelClone.scale.set(5, 5, 5);
                    modelClone.position.x = 20 * Math.cos((Math.PI / 1.5) * i / NUM_MODELS + (Math.PI / 6));
                    modelClone.position.y = -2;
                    modelClone.position.z = -20 * Math.sin((Math.PI / 1.5) * i / NUM_MODELS + (Math.PI / 6));
                    // modelClone.rotation.y = 90;
                    modelClone.castShadow = true;
                    modelClone.receiveShadow = true;
                    _this.addToScene( `model${i}`, modelClone );
                    modelClone.userData.originalMedium = 'remote';
                }
            } );
    },

    addToScene(objectId, object) {
        const scene = this.remoteScene;
        const camera = this.remoteCamera;

        scene.add(object);
        scene.userData.objects[objectId] = object;
    },

    update(oldData) {
        const data = this.data;

        if (data.fps != oldData.fps) {
            this.tick = AFRAME.utils.throttleTick(this.tick, 1 / data.fps * 1000, this);
            this.remoteLocal.updateFPS(data.fps);
        }

        if (data.latency != oldData.latency) {
            this.remoteLocal.setLatency(data.latency);
        }
    },

    tick: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;

        const scene = this.remoteScene;
        const camera = this.remoteCamera;

        this.box.rotation.x += 0.01;
        this.box.rotation.y += 0.01;
        this.box.rotation.z += 0.01;
    }
});
