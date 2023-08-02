import Stats from 'three/examples/jsm/libs/stats.module.js';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';

import { Experiments, RenderingMedium, DefaultLatency } from '../constants';

AFRAME.registerComponent('background-scene', {
    schema: {
    },

    init: async function() {
        const el = this.el;
        const data = this.data;

        const sceneEl = el;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        const renderer = sceneEl.renderer;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        this.backgroundScene = sceneEl.systems['remote-local'].backgroundScene;

        const _this = this;

        this.elapsed = 0;
        this.clock = new THREE.Clock();

        const gltfLoader = new GLTFLoader();

        function modelLoader(path, modelName) {
            gltfLoader.setPath( path );
            return new Promise((resolve, reject) => {
                gltfLoader.load(modelName, data => resolve(data), null, reject);
            });
        }

        const light = new THREE.AmbientLight( 0xffffff, 0.9 );
        this.backgroundScene.add( light );

        new RGBELoader()
            .setPath( 'assets/textures/' )
            .load( 'farm_field_puresky_1k.hdr', function( texture ) {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                _this.backgroundScene.background = texture;
                _this.backgroundScene.environment = texture;
            } );

        const sponza = await modelLoader( 'assets/models/', 'sponza_64Tx_low_poly.glb' );
        const model = sponza.scene;
        model.scale.set(3, 3, 3);
        model.position.set(0.7, -0.2, 17);
        model.rotation.set(0, Math.PI/2, 0);
        model.visible = true;
        this.backgroundScene.add(model);
    },
});
