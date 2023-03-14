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

        // scene.background = new THREE.Color(0xF06565);

        const boxMaterial = new THREE.MeshBasicMaterial( { color: 0x7074FF } );
        const boxGeometry = new THREE.BoxGeometry(5, 5, 5);

        const NUM_LIGHTS = 6;
        for (var i = -Math.floor(NUM_LIGHTS / 2); i < Math.floor(NUM_LIGHTS / 2); i++) {
            const light = new THREE.PointLight( 0xFFEEEE, 1, 0 );
            light.position.set( 50 * i, 1.6, -30 );
            scene.add( light );

            // const box = new THREE.Mesh(boxGeometry, boxMaterial);
            // box.position.set( 50 * i, 1.6, -30 );
            // scene.add( box );
        }

        this.box = new THREE.Mesh(boxGeometry, boxMaterial);
        this.box.position.x = 10;
        this.box.position.y = 1.6;
        this.box.position.z = -30;
        scene.add(this.box); // add to remote scene

        new EXRLoader()
            .setPath( 'assets/textures/' )
            .load( 'starmap_2020_4k_gal.exr', function ( texture ) {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                scene.background = texture;
                scene.environment = texture;
            } );

        const loader = new GLTFLoader();
        loader.setPath( 'assets/models/DamagedHelmet/glTF/' )
            .load( 'DamagedHelmet.gltf', function ( gltf ) {
                const model = gltf.scene;

                model.scale.set(5, 5, 5);
                model.position.x = -10;
                model.position.y = 1.6;
                model.position.z = -30;
                scene.add( model );
            } );

        loader.setPath( 'assets/models/Sword/' )
            .load( 'scene.gltf', function ( gltf ) {
                const model = gltf.scene;

                model.scale.set(0.2, 0.2, 0.2);
                model.position.x = 10;
                model.position.y = 1.6;
                model.position.z = -30;
                scene.add( model );
            } );

        loader.setPath( 'assets/models/StarWarsVenator/' )
            .load( 'scene.gltf', function ( gltf ) {
                const model = gltf.scene;

                model.scale.set(50, 50, 50);
                model.position.y = 1.6;
                model.position.z = -75;
                scene.add( model );
            } );
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
