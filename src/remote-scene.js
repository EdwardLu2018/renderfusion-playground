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

        const origAdd = scene.add;
        scene.add = function() {
            arguments[0].medium = "remote";
            origAdd.apply(this, arguments);
        }

        // scene.background = new THREE.Color(0xF06565);
        const textureLoader = new THREE.TextureLoader();
        const gltfLoader = new GLTFLoader();

        const NUM_LIGHTS = 6;
        for (var i = -Math.floor(NUM_LIGHTS / 2); i < Math.floor(NUM_LIGHTS / 2); i++) {
            const light = new THREE.DirectionalLight( 0xEEEEFF, 1 );
            light.position.set( 50 * i, 1.6, -30 );
            light.castShadow = true;
            scene.add( light );

            // const box = new THREE.Mesh(boxGeometry, boxMaterial);
            // box.position.set( 50 * i, 1.6, -30 );
            // scene.add( box );
        }

        const boxMaterial = new THREE.MeshBasicMaterial( { color: 0x7074FF } );
        const boxGeometry = new THREE.BoxGeometry(5, 5, 5);

        this.box = new THREE.Mesh(boxGeometry, boxMaterial);
        this.box.position.x = 10;
        this.box.position.y = 1.6;
        this.box.position.z = -30;
        this.box.castShadow = true;
        this.box.receiveShadow = true;
        scene.add(this.box); // add to remote scene

        new EXRLoader()
            .setPath( 'assets/textures/' )
            .load( 'farm_field_puresky_4k.exr', function ( texture ) {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                scene.background = texture;
                scene.environment = texture;
            } );

        // new RGBELoader()
        //     .setPath( 'assets/textures/' )
        //     .load( 'san_giuseppe_bridge_2k.hdr', function ( texture ) {
        //         texture.mapping = THREE.EquirectangularReflectionMapping;
        //         scene.background = texture;
        //         scene.environment = texture;
        //     } );

        textureLoader
            .setPath( 'assets/textures/' )
            .load( 'height_map.png' , function ( texture ) {
                texture.wrapS = texture.wrapT = THREE.Repeatwrapping;
                texture.repeat.set(1, 1);

                textureLoader.load('ground.jpg', function ( texture1 ) {
                    texture1.wrapS = texture1.wrapT = THREE.RepeatWrapping;
                    texture1.anisotropy = 16;
                    texture1.encoding = THREE.sRGBEncoding;

                    const groundMaterial = new THREE.MeshStandardMaterial({
                        map: texture1,
                        // wireframe: true,
                        displacementMap: texture,
                        displacementScale: 50,
                    });

                    const groundGeometry = new THREE.PlaneGeometry(1200, 1200, 100, 100);
                    groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
                    groundMesh.receiveShadow = true;
                    groundMesh.rotation.x = -Math.PI / 2;
                    groundMesh.position.y = -80;
                    scene.add(groundMesh);
                } );
            } );

        gltfLoader
            .setPath( 'assets/models/DamagedHelmet/glTF/' )
            .load( 'DamagedHelmet.gltf', function ( gltf ) {
                const model = gltf.scene;

                model.scale.set(5, 5, 5);
                model.position.x = -10;
                model.position.y = 1.6;
                model.position.z = -30;
                model.castShadow = true;
                model.receiveShadow = true;
                scene.add( model );
            } );

        gltfLoader
            .setPath( 'assets/models/' )
            .load( 'sword.glb', function ( gltf ) {
                const model = gltf.scene;

                model.scale.set(0.2, 0.2, 0.2);
                model.position.x = 10;
                model.position.y = 1.6;
                model.position.z = -30;
                model.castShadow = true;
                model.receiveShadow = true;
                scene.add( model );
            } );

        gltfLoader
            .setPath( '' )
            .load( 'https://dl.dropboxusercontent.com/s/p0cxjnps8w9g4vm/pine_tree.glb', function ( gltf ) {
                const model = gltf.scene;

                const NUM_TREES = 5;
                for (var i = 0; i < NUM_TREES; i++) {
                    const model0 = model.clone();
                    model0.scale.set(25, 25, 25);
                    model0.position.x = 350 * Math.cos((Math.PI / 1.5) * i / NUM_TREES + (Math.PI / 4));
                    model0.position.y = -50;
                    model0.position.z = -350 * Math.sin((Math.PI / 1.5) * i / NUM_TREES + (Math.PI / 4));
                    model.castShadow = true;
                    model.receiveShadow = true;
                    // model0.rotation.y = Math.random() * 2 * Math.PI;
                    // model0.position.x = 0;
                    // model0.position.y = 1.6;
                    // model0.position.z = -50;
                    scene.add( model0 );
                }
            } );
    },

    addToScene(object) {
        const scene = this.remoteScene;
        const camera = this.remoteCamera;

        object.medium = "remote";
        scene.add(object);
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
