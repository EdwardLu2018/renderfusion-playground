// import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
// import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import ThreeMeshUI from 'three-mesh-ui';

import FontJSON from '/assets/fonts/Roboto-msdf.json';
import FontImage from '/assets/fonts/Roboto-msdf.png';

AFRAME.registerComponent('local-scene', {
    schema: {
        fps: {type: 'number', default: 90},
    },

    init: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = el;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.compositor = sceneEl.systems['compositor'];
        this.experimentManager = sceneEl.systems['experiment-manager'];

        // this is the local scene init //
        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        const _this = this;

        const boxMaterial = new THREE.MeshBasicMaterial({color: 'red'});
        const boxGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.25);
        this.box = new THREE.Mesh(boxGeometry, boxMaterial);
        this.box.position.set(0, 1.1, -1);
        this.box.castShadow = true;
        this.box.receiveShadow = true;
        _this.addToScene( 'redBox', this.box ); // add to local scene
        this.box.userData.originalMedium = 'local';
        this.box.userData.grabbable = true;

        // new RGBELoader()
        //     .setPath( 'assets/textures/' )
        //     .load( 'san_giuseppe_bridge_2k.hdr', function ( texture ) {
        //         texture.mapping = THREE.EquirectangularReflectionMapping;
        //         scene.background = texture;
        //         scene.environment = texture;
        //     } );

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

        const container = new ThreeMeshUI.Block( {
            justifyContent: 'center',
            contentDirection: 'row',
            fontFamily: FontJSON,
            fontTexture: FontImage,
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11
        } );
        container.add( button1, button2 );

        this.menu = new ThreeMeshUI.Block( {
            justifyContent: 'center',
            contentDirection: 'column',
            fontFamily: FontJSON,
            fontTexture: FontImage,
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11
        } );
        this.menu.add( container, button3, button4 );
        this.menu.scale.set(1, 1, 1);
        this.menu.position.set(-2, 1.2, -1);
        this.menu.rotation.set(0, Math.PI / 4, 0);
        _this.addToScene( 'menu', this.menu );
        this.menu.userData.originalMedium = 'local';

        var model;
        const loader = new GLTFLoader();
        loader
            .setPath( 'assets/models/' )
            .load( 'sword.glb', function ( gltf ) {
                model = gltf.scene;
                model.scale.set(0.25, 0.25, 0.25);
                model.position.set(-0.75, 1.5, -1);
                model.rotation.y += Math.PI / 2;
                model.traverse( function( node ) {
                    if ( node.isMesh ) { node.castShadow = true; node.receiveShadow = true; node.userData.grabbable = true; }
                } );
                _this.addToScene( 'swordLeft', model );
                model.userData.originalMedium = 'local';
            } );
    },

    addToScene(objectId, object) {
        const el = this.el;
        const data = this.data;

        const scene = el.object3D;
        const camera = el.camera;

        scene.add(object);
        object.userData.renderingMedium = 'local';
        this.experimentManager.objects[objectId] = object;
    },

    update(oldData) {
        const data = this.data;

        if (data.fps != oldData.fps) {
            this.compositor.data.fps = data.fps;
        }
    },

    tick: function () {
        ThreeMeshUI.update();

        this.box.rotation.x -= 0.01;
        this.box.rotation.y -= 0.01;
        this.box.rotation.z -= 0.01;
    }
});
