import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
// import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';

import ThreeMeshUI from 'three-mesh-ui';

import FontJSON from '/assets/fonts/Roboto-msdf.json';
import FontImage from '/assets/fonts/Roboto-msdf.png';

import { ExperimentsList, RenderingMedium, EVENTS } from './constants';

AFRAME.registerComponent('local-scene', {
    schema: {
        fps: {type: 'number', default: 90},
        reset: {type: 'boolean'},
    },

    init: function() {
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
        var currentExp = 0;
        const boxMaterial = new THREE.MeshBasicMaterial({color: 'red'});
        const boxGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.25);
        this.box = new THREE.Mesh(boxGeometry, boxMaterial);
        this.box.position.set(0, 1.1, -1);
        this.box.castShadow = true;
        this.box.receiveShadow = true;
        this.addToScene( 'redBox', this.box ); // add to local scene
        this.box.userData.originalMedium = RenderingMedium.Local;
        this.box.userData.grabbable = true;

        // new RGBELoader()
        //     .setPath( 'assets/textures/' )
        //     .load( 'san_giuseppe_bridge_2k.hdr', function( texture ) {
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

        const prevButton = new ThreeMeshUI.Block( buttonOptions );
        const nextButton = new ThreeMeshUI.Block( buttonOptions );
        const doneButton = new ThreeMeshUI.Block( buttonOptions );
        prevButton.add( new ThreeMeshUI.Text( { content: 'Previous' } ) );
        nextButton.add( new ThreeMeshUI.Text( { content: 'Next' } ) );
        doneButton.add( new ThreeMeshUI.Text( { content: 'Done' } ) );
        const buttonList = [prevButton, nextButton, doneButton];

        prevButton.setupState( {
            state: 'selected',
            attributes: selectedAttributes,
            onSet: () => {
                currentExp -= 1;
			    if ( currentExp < 0 ) currentExp = ExperimentsList.length - 1;
                this.experimentManager.changeExperiment(ExperimentsList[currentExp]);
            }
        });
        prevButton.setupState( hoveredStateAttributes );
        prevButton.setupState( idleStateAttributes );

        nextButton.setupState( {
            state: 'selected',
            attributes: selectedAttributes,
            onSet: () => {
                currentExp = ( currentExp + 1 ) % ExperimentsList.length;
                this.experimentManager.changeExperiment(ExperimentsList[currentExp]);
		    }
        });
        nextButton.setupState( hoveredStateAttributes );
        nextButton.setupState( idleStateAttributes );

        doneButton.setupState( {
            state: 'selected',
            attributes: selectedAttributes,
            onSet: () => {
                el.emit(EVENTS.BUTTON_DONE_PRESSED, {});
		    }
        });
        doneButton.setupState( hoveredStateAttributes );
        doneButton.setupState( idleStateAttributes );

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
        this.menu.add( container, doneButton );
        this.menu.scale.set(1, 1, 1);
        this.menu.position.set(-2, 1.2, -1);
        this.menu.rotation.set(0, Math.PI / 4, 0);
        this.addToScene( 'menu', this.menu );
        this.menu.userData.originalMedium = RenderingMedium.Local;

        buttonList.forEach( ( obj ) => {
            obj.setState( 'idle' );
        } );

        var model;
        const loader = new GLTFLoader();
        loader
            .setPath( 'assets/models/' )
            .load( 'sword.glb', function( gltf ) {
                model = gltf.scene;
                model.scale.set(0.25, 0.25, 0.25);
                model.position.set(-0.75, 1.5, -1);
                model.rotation.y = Math.PI / 2;
                model.traverse( function( node ) {
                    if ( node.isMesh ) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        node.userData.grabbable = true;
                    }
                } );
                model.userData.originalMedium = RenderingMedium.Local;
                _this.addToScene( 'sword', model );
            } );

        loader
            .setPath( 'assets/models/' )
            .load( 'sword.glb', function( gltf ) {
                model = gltf.scene;
                model.scale.set(0.25, 0.25, 0.25);
                model.position.set(0, 1.5, 1.2);
                model.rotation.z += Math.PI;
                model.rotation.y += Math.PI;
                model.traverse( function( node ) {
                    if ( node.isMesh ) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        if (node.material) {
                            node.material.transparent = true;
                            node.material.opacity = 0.3;
                        }
                    }
                } );
                model.userData.originalMedium = RenderingMedium.Local;
                _this.addToScene( 'sword2', model );
            } );
    },

    addToScene(objectId, object) {
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

    update(oldData) {
        const data = this.data;

        if (data.fps !== oldData.fps) {
            this.compositor.data.fps = data.fps;
        }

        if (data.reset) {
            this.experimentManager.objects['sword'].position.set(-0.75, 1.5, -1);
            this.experimentManager.objects['sword'].rotation.set(0, Math.PI / 2, 0);
            this.experimentManager.objects['redBox'].position.set(0, 1.1, -1);
        }
    },

    tick: function() {
        const el = this.el;
        const data = this.data;

        ThreeMeshUI.update();

        this.box.rotation.x += 0.01;
        this.box.rotation.y += 0.01;
        this.box.rotation.z += 0.01;
    }
});
