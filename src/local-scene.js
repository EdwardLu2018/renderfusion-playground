import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
// import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';

import ThreeMeshUI from 'three-mesh-ui';

import FontJSON from '/assets/fonts/Roboto-msdf.json';
import FontImage from '/assets/fonts/Roboto-msdf.png';

import { ExperimentsList, RenderingMedium, EVENTS, ButtonOptions } from './constants';

AFRAME.registerComponent('local-scene', {
    schema: {
        fps: {type: 'number', default: 90},
    },

    init: async function() {
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

        this.elapsed = 0;
        this.clock = new THREE.Clock();

        const gltfLoader = new GLTFLoader();

        function modelLoader(path, modelName) {
            gltfLoader.setPath( path );
            return new Promise((resolve, reject) => {
                gltfLoader.load(modelName, data => resolve(data), null, reject);
            });
        }

        // new RGBELoader()
        //     .setPath( 'assets/textures/' )
        //     .load( 'san_giuseppe_bridge_2k.hdr', function( texture ) {
        //         texture.mapping = THREE.EquirectangularReflectionMapping;
        //         scene.background = texture;
        //         scene.environment = texture;
        //     } );

        const hoveredStateAttributes = {
            state: 'hovered',
            attributes: {
                offset: 0.035,
                backgroundColor: new THREE.Color( 0x999999 ),
                backgroundOpacity: 1,
                fontColor: new THREE.Color( 0xffffff )
            },
        };

        const idleStateAttributes = {
            state: 'idle',
            attributes: {
                offset: 0.035,
                backgroundColor: new THREE.Color( 0x666666 ),
                backgroundOpacity: 0.3,
                fontColor: new THREE.Color( 0xffffff )
            },
        };

        const selectedAttributes = {
            offset: 0.02,
            backgroundColor: new THREE.Color( 0x777777 ),
            fontColor: new THREE.Color( 0x222222 )
        };

        const prevButton = new ThreeMeshUI.Block( ButtonOptions );
        const nextButton = new ThreeMeshUI.Block( ButtonOptions );
        const resetButton = new ThreeMeshUI.Block( ButtonOptions );
        prevButton.add( new ThreeMeshUI.Text( { content: 'Previous\nExperiment' } ) );
        nextButton.add( new ThreeMeshUI.Text( { content: 'Next\nExperiment' } ) );
        resetButton.add( new ThreeMeshUI.Text( { content: 'Reset' } ) );
        const buttonList = [prevButton, nextButton, resetButton];

        var currentExpIdx = 0;
        prevButton.setupState( {
            state: 'selected',
            attributes: selectedAttributes,
            onSet: () => {
                currentExpIdx -= 1;
			    if ( currentExpIdx < 0 ) currentExpIdx = ExperimentsList.length - 1;
                this.experimentManager.changeExperiment(ExperimentsList[currentExpIdx]);
            }
        });
        prevButton.setupState( hoveredStateAttributes );
        prevButton.setupState( idleStateAttributes );

        nextButton.setupState( {
            state: 'selected',
            attributes: selectedAttributes,
            onSet: () => {
                currentExpIdx = ( currentExpIdx + 1 ) % ExperimentsList.length;
                this.experimentManager.changeExperiment(ExperimentsList[currentExpIdx]);
		    }
        });
        nextButton.setupState( hoveredStateAttributes );
        nextButton.setupState( idleStateAttributes );

        resetButton.setupState( {
            state: 'selected',
            attributes: selectedAttributes,
            onSet: () => {
                el.emit(EVENTS.BUTTON_RESET_PRESSED, {});
		    }
        });
        resetButton.setupState( hoveredStateAttributes );
        resetButton.setupState( idleStateAttributes );

        const container = new ThreeMeshUI.Block( {
            justifyContent: 'center',
            contentDirection: 'row',
            fontFamily: FontJSON,
            fontTexture: FontImage,
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11
        } );
        container.add( prevButton, nextButton );

        this.menu = new ThreeMeshUI.Block( {
            justifyContent: 'center',
            contentDirection: 'column',
            fontFamily: FontJSON,
            fontTexture: FontImage,
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11
        } );
        this.menu.add( container, resetButton );
        this.menu.scale.set(1, 1, 1);
        this.menu.position.set(-2, 1.2, -1);
        this.menu.rotation.set(0, Math.PI / 4, 0);
        this.addToScene( 'menu', this.menu );
        this.menu.userData.originalMedium = RenderingMedium.Local;

        buttonList.forEach( ( obj ) => {
            obj.setState( 'idle' );
        } );

        const boxMaterial = new THREE.MeshStandardMaterial({color: 0x8B0000});
        const boxGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        this.box = new THREE.Mesh(boxGeometry, boxMaterial);
        this.box.position.set(0, 1.1, -1);
        this.addToScene( 'redBox', this.box ); // add to local scene
        this.box.userData.originalMedium = RenderingMedium.Local;
        this.box.userData.grabbable = true;

        const boxMaterial1 = new THREE.MeshStandardMaterial({color: 0x5C4033});
        const boxGeometry1 = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        var box = new THREE.Mesh(boxGeometry1, boxMaterial1);
        box.scale.set(2, 2, 2);
        box.position.set(0, -0.05, -10);
        box.rotation.set(0, -Math.PI / 7, 0);
        this.addToScene( 'brownBox1', box );
        box.userData.originalMedium = RenderingMedium.Local;

        box = new THREE.Mesh(boxGeometry1, boxMaterial1);
        box.scale.set(5, 5, 5);
        box.position.set(-2, 0.2, -8);
        box.rotation.set(0, Math.PI / 5, 0);
        this.addToScene( 'brownBox2', box );
        box.userData.originalMedium = RenderingMedium.Local;

        box = new THREE.Mesh(boxGeometry1, boxMaterial1);
        box.scale.set(3, 3, 3);
        box.position.set(5, 0, -6);
        box.rotation.set(0, Math.PI / 8, 0);
        this.addToScene( 'brownBox3', box );
        box.userData.originalMedium = RenderingMedium.Local;

        var model;
        model = await modelLoader( 'assets/models/', 'sword.glb' );
        const sword = model.scene;
        sword.scale.set(0.25, 0.25, 0.25);
        sword.position.set(-0.75, 1.5, -1);
        sword.rotation.y = Math.PI / 2;
        sword.traverse( function( node ) {
            if ( node.isMesh ) {
                node.userData.grabbable = true;
            }
        } );
        sword.userData.originalMedium = RenderingMedium.Local;
        _this.addToScene( 'sword', sword );
        _this.sword = sword;

        model = await modelLoader( 'assets/models/', 'sword.glb' );
        const sword2 = model.scene;
        sword2.scale.set(0.25, 0.25, 0.25);
        sword2.position.set(1, 1.5, 0);
        // sword2.position.set(0, 1.5, 1.5);
        sword2.rotation.z = Math.PI;
        sword2.rotation.y = -Math.PI / 2;
        sword2.traverse( function( node ) {
            if ( node.isMesh ) {
                if (node.material) {
                    node.material.transparent = true;
                    node.material.opacity = 0.35;
                }
            }
        } );
        sword2.userData.originalMedium = RenderingMedium.Local;
        _this.addToScene( 'sword2', sword2 );
    },

    addToScene: function(objectId, object) {
        const el = this.el;
        const data = this.data;

        const scene = el.object3D;
        const camera = el.camera;

        scene.add(object);
        object.traverse( function( node ) {
            if ( node.isMesh ) {
                node.userData.renderingMedium = RenderingMedium.Local;
            }
        } );
        object.userData.renderingMedium = RenderingMedium.Local;
        this.experimentManager.objects[objectId] = object;
    },

    update: function(oldData) {
        const data = this.data;

        if (data.fps !== oldData.fps) {
            this.compositor.data.fps = data.fps;
        }
    },

    reset: function() {
        const el = this.el;
        const data = this.data;

        const scene = el.object3D;
        const camera = el.camera;

        if (this.sword) {
            // this.sword.position.set(-0.75, 1.5, -1);

            const r = 1.5;
            const x = 2 * Math.random() - 1;
            this.sword.position.set(x, 1.5, ((Math.random() > 0.5) ? -1 : 1) * Math.sqrt(r**2 - x**2));
            this.sword.rotation.set(0, Math.PI / 2, 0);
        }

        if (this.box) {
            this.box.position.set(0, 1.1, -1);
        }
    },

    tick: function() {
        const el = this.el;
        const data = this.data;

        ThreeMeshUI.update();

        if (this.box) {
            this.box.rotation.x += 0.01;
            this.box.rotation.y += 0.01;
            this.box.rotation.z += 0.01;
        }
    }
});
