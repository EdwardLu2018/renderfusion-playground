// import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
// import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import ThreeMeshUI from 'three-mesh-ui'

import FontJSON from '/assets/fonts/Roboto-msdf.json';
import FontImage from '/assets/fonts/Roboto-msdf.png';

AFRAME.registerComponent('local-scene', {
    schema: {
    },

    init: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = el;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        // this is the local scene init //
        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        const _this = this;

        scene.userData.objects = {};

        const boxMaterial = new THREE.MeshBasicMaterial({color: 'red'});
        const boxGeometry = new THREE.BoxGeometry(5, 5, 5);
        this.box = new THREE.Mesh(boxGeometry, boxMaterial);
        this.box.position.x = 0;
        this.box.position.y = 1.6;
        this.box.position.z = -30;
        _this.addToScene( 'redBox', this.box ); // add to local scene

        // new RGBELoader()
        //     .setPath( 'assets/textures/' )
        //     .load( 'san_giuseppe_bridge_2k.hdr', function ( texture ) {
        //         texture.mapping = THREE.EquirectangularReflectionMapping;
        //         scene.background = texture;
        //         scene.environment = texture;
        //     } );

        const container = new ThreeMeshUI.Block( {
            justifyContent: 'center',
            contentDirection: 'column',
            fontFamily: FontJSON,
            fontTexture: FontImage,
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11
        } );

        const buttonOptions = {
            width: 0.4,
            height: 0.15,
            justifyContent: 'center',
            offset: 0.05,
            margin: 0.02,
            borderRadius: 0.075
        };

        const button1 = new ThreeMeshUI.Block( buttonOptions );
        const button2 = new ThreeMeshUI.Block( buttonOptions );
        const button3 = new ThreeMeshUI.Block( buttonOptions );
        const button4 = new ThreeMeshUI.Block( buttonOptions );

        button1.add( new ThreeMeshUI.Text( { content: 'left' } ) );
        button2.add( new ThreeMeshUI.Text( { content: 'right' } ) );
        button3.add( new ThreeMeshUI.Text( { content: 'middle' } ) );
        button4.add( new ThreeMeshUI.Text( { content: 'reset' } ) );

        const container1 = new ThreeMeshUI.Block( {
            justifyContent: 'center',
            contentDirection: 'row',
            fontFamily: FontJSON,
            fontTexture: FontImage,
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11
        } );

        container1.add( button1, button2 );
        container.add( container1, button3, button4 );

        container.position.set(-7, -3, -20);
        container.scale.set(7, 7, 7);
        container.rotation.x = -0.2;
        _this.addToScene( 'menu', container );

        const loader = new GLTFLoader();
        loader.setPath( 'assets/models/' )
            .load( 'sword.glb', function ( gltf ) {
                const model = gltf.scene;

                model.scale.set(0.2, 0.2, 0.2);
                model.position.x = -10;
                model.position.y = 1.6;
                model.position.z = -30;
                _this.addToScene( 'swordLeft', model );
            } );
    },

    addToScene(objectId, object) {
        const el = this.el;
        const data = this.data;

        const scene = el.object3D;
        const camera = el.camera;

        scene.add(object);
        scene.userData.objects[objectId] = object;
    },

    tick: function () {
        ThreeMeshUI.update();

        this.box.rotation.x -= 0.01;
        this.box.rotation.y -= 0.01;
        this.box.rotation.z -= 0.01;
    }
});
