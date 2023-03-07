import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
// import { ThreeMeshUI } from 'three-mesh-ui'

AFRAME.registerSystem('local-scene', {
    schema: {
    },

    init: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        const renderer = sceneEl.renderer;

        // this is the local scene init //
        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        const boxMaterial = new THREE.MeshBasicMaterial({color: 'red'});
        const boxGeometry = new THREE.BoxGeometry(5, 5, 5);
        this.box1 = new THREE.Mesh(boxGeometry, boxMaterial);
        this.box1.position.x = 0;
        this.box1.position.y = 1.6;
        this.box1.position.z = -30;
        scene.add(this.box1); // add to local scene

        // new RGBELoader()
        //     .setPath( 'assets/textures/' )
        //     .load( 'san_giuseppe_bridge_2k.hdr', function ( texture ) {
        //         texture.mapping = THREE.EquirectangularReflectionMapping;
        //         scene.background = texture;
        //         scene.environment = texture;
        //     } );
    },

    tick: function () {
        this.box1.rotation.x -= 0.01;
        this.box1.rotation.y -= 0.01;
        this.box1.rotation.z -= 0.01;
    }
});
