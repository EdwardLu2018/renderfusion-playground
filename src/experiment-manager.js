import { Experiments, RenderingMedium, Resolution, ButtonOptions, EVENTS } from './constants';

import ThreeMeshUI from 'three-mesh-ui';

import FontJSON from '/assets/fonts/Roboto-msdf.json';
import FontImage from '/assets/fonts/Roboto-msdf.png';

AFRAME.registerSystem('experiment-manager', {
    schema: {
        lowPolyLocalFPS: {type: 'number', default: -1},
        highPolyLocalFPS: {type: 'number', default: 11},
    },

    init: function() {
        const el = this.el;
        const data = this.data;

        if (this.objects === undefined) this.objects = {};

        const sceneEl = el.sceneEl;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.experiment = Experiments.LowPolyLocal;

        this.remoteLocal = sceneEl.systems['remote-local'];
        this.compositor = sceneEl.systems['compositor'];

        this.remoteScene = this.remoteLocal.remoteScene;
        this.remoteCamera = this.remoteLocal.remoteCamera;

        this.localScene = sceneEl.object3D;
        this.localCamera = sceneEl.camera;

        const ButtonOptions1 = { ...ButtonOptions };
        ButtonOptions1.width = 1.0;
        const block1 = new ThreeMeshUI.Block( ButtonOptions1 );
        const block2 = new ThreeMeshUI.Block( ButtonOptions1 );
        const block3 = new ThreeMeshUI.Block( ButtonOptions1 );
        ButtonOptions1.height = 0.55;
        const block4 = new ThreeMeshUI.Block( ButtonOptions1 );

        block1.add( new ThreeMeshUI.Text( { content: 'Current Experiment:' } ) );
        this.experimentText = new ThreeMeshUI.Text( { content: '' });
        block2.add( this.experimentText );
        this.timerText = new ThreeMeshUI.Text( { content: 'Time Elasped: None' });
        block3.add( this.timerText );
        this.instructionsText = new ThreeMeshUI.Text( { content: '' });
        block4.add( this.instructionsText );

        this.infoBlock = new ThreeMeshUI.Block( {
            justifyContent: 'center',
            contentDirection: 'column',
            fontFamily: FontJSON,
            fontTexture: FontImage,
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11
        } );
        this.infoBlock.add(block1, block2, block3, block4);
        this.infoBlock.scale.set(1, 1, 1);
        this.infoBlock.position.set(2, 1.2, -1);
        this.infoBlock.rotation.set(0, -Math.PI / 4, 0);
        this.localScene.add(this.infoBlock);
        this.infoBlock.userData.originalMedium = RenderingMedium.Local;
        this.infoBlock.userData.renderingMedium = RenderingMedium.Local;
        this.objects['info-block'] = this.infoBlock;

        sceneEl.setAttribute('task-manager', '');
    },

    updateInstructions: function(text) {
        this.instructionsText.set( { content: text } );
    },

    updateTimer: function(timeLeft) {
        this.timerText.set( { content: `Time Elasped: ${timeLeft}s` } );
    },

    swapControllers: function(renderingMediumType) {
        const handLeft = document.getElementById('handLeft');
        const handRight = document.getElementById('handRight');
        if (renderingMediumType === RenderingMedium.Local) {
            handLeft.setAttribute('remote-controller', 'enabled', false);
            handRight.setAttribute('remote-controller', 'enabled', false);
        } else if (renderingMediumType === RenderingMedium.Remote) {
            handLeft.setAttribute('remote-controller', 'enabled', true);
            handRight.setAttribute('remote-controller', 'enabled', true);
        }
    },

    swapRenderingMedium: function(objectId, renderingMediumType) {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;

        const localSceneSys = sceneEl.components['local-scene'];
        const remoteSceneSys = sceneEl.components['remote-scene'];
        const object = this.objects[objectId];

        if (renderingMediumType === RenderingMedium.Local) { // swap remote to local
            if (object.userData.renderingMedium === RenderingMedium.Remote) {
                object.remove();
                localSceneSys.addToScene(objectId, object);
            } else if (objectId === 'background') {
                this.localScene.background = object;
                this.localScene.environment = object;
                this.remoteScene.background = object;
                this.remoteScene.environment = object;
            }
        } else { // swap local to remote
            if (object.userData.renderingMedium === RenderingMedium.Local) {
                object.remove();
                remoteSceneSys.addToScene(objectId, object);
            } else if (objectId === 'background') {
                this.localScene.background = object;
                this.localScene.environment = object;
                this.remoteScene.background = object;
                this.remoteScene.environment = object;
            }
        }

        const castShadow = false;//(renderingMediumType === RenderingMedium.Remote);
        if (objectId.includes('model')) {
            object.traverse( function( node ) {
                if ( node.isMesh ) { node.castShadow = castShadow; node.receiveShadow = castShadow; }
            } );
        } else {
            object.castShadow = castShadow;
            object.receiveShadow = castShadow;
        }
    },

    swapResolution: function(objectId, resolutionType) {
        const object = this.objects[objectId];

        // if (objectId.includes('model')) {
        //     const model = object;
        //     if ((resolutionType === Resolution.High && objectId.includes('High')) ||
        //         (resolutionType == Resolution.Low && objectId.includes('Low'))) {
        //         model.visible = true;
        //     }
        //     else
        //     if ((resolutionType === Resolution.High && objectId.includes('Low')) ||
        //         (resolutionType === Resolution.Low && objectId.includes('High'))) {
        //         model.visible = false;
        //     }
        // } else {
        //     // if (object.material === undefined) return;
        //     // if (resolutionType === Resolution.High) {
        //     //     object.material = new THREE.MeshStandardMaterial({ color: object.material.color });
        //     // }
        //     // else
        //     // if (resolutionType === Resolution.Low) {
        //     //     object.material = new THREE.MeshBasicMaterial({ color: object.material.color });
        //     // }
        // }
    },

    changeExperiment: function(experiment) {
        const el = this.el;
        const data = this.data;
        const sceneEl = el.sceneEl;

        this.experiment = experiment;
        this.experimentText.set( { content: this.experiment } );

        switch (this.experiment) {
            case Experiments.LowPolyLocal:
                this.compositor.data.doAsyncTimeWarp = false;
                this.compositor.data.preferLocal = true;
                // sceneEl.renderer.physicallyCorrectLights = false;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    this.swapRenderingMedium(objectId, RenderingMedium.Local);
                    this.swapResolution(objectId, Resolution.Low);
                }
                sceneEl.setAttribute('local-scene', 'fps', data.lowPolyLocalFPS);
                this.swapControllers(RenderingMedium.Local);
                break;

            // case Experiments.HighPolyLocal:
            //     this.compositor.data.doAsyncTimeWarp = false;
            //     for (const [objectId, object] of Object.entries(this.objects)) {
            //         this.swapRenderingMedium(objectId, RenderingMedium.Local);
            //         this.swapResolution(objectId, Resolution.High);
            //     }
            //     sceneEl.setAttribute('local-scene', 'fps', data.highPolyLocalFPS);
            //     this.swapControllers(RenderingMedium.Local);
            //     break;

            // case Experiments.Remote:
            //     this.compositor.data.doAsyncTimeWarp = false;
            //     for (const [objectId, object] of Object.entries(this.objects)) {
            //         this.swapRenderingMedium(objectId, RenderingMedium.Remote);
            //         this.swapResolution(objectId, Resolution.High);
            //     }
            //     sceneEl.setAttribute('local-scene', 'fps', data.lowPolyLocalFPS);
            //     this.swapControllers(RenderingMedium.Remote);
            //     break;

            case Experiments.RemoteATW:
                this.compositor.data.doAsyncTimeWarp = true;
                this.compositor.data.preferLocal = false;
                // sceneEl.renderer.physicallyCorrectLights = true;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    this.swapRenderingMedium(objectId, RenderingMedium.Remote);
                    this.swapResolution(objectId, Resolution.High);
                }
                sceneEl.setAttribute('local-scene', 'fps', data.lowPolyLocalFPS);
                this.swapControllers(RenderingMedium.Remote);
                break;

            // case Experiments.Mixed:
            //     this.compositor.data.doAsyncTimeWarp = false;
            //     for (const [objectId, object] of Object.entries(this.objects)) {
            //         if (object.userData.originalMedium === RenderingMedium.Remote) {
            //             this.swapRenderingMedium(objectId, RenderingMedium.Remote);
            //             this.swapResolution(objectId, Resolution.High);
            //         } else if (object.userData.originalMedium === RenderingMedium.Local) {
            //             if (!objectId.includes('knight')) {
            //                 this.swapRenderingMedium(objectId, RenderingMedium.Local);
            //                 this.swapResolution(objectId, Resolution.Low);
            //             } else {
            //                 this.swapRenderingMedium(objectId, RenderingMedium.Remote);
            //             }
            //         }
            //     }
            //     sceneEl.setAttribute('local-scene', 'fps', data.lowPolyLocalFPS);
            //     this.swapControllers(RenderingMedium.Local);
            //     break;

            case Experiments.MixedATW:
                this.compositor.data.doAsyncTimeWarp = true;
                this.compositor.data.preferLocal = true;
                // sceneEl.renderer.physicallyCorrectLights = true;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    if (objectId.includes('sponza')) {
                        this.swapRenderingMedium(objectId, RenderingMedium.Local);
                        this.swapResolution(objectId, Resolution.Low);
                    } else if (object.userData.originalMedium === RenderingMedium.Remote) {
                        this.swapRenderingMedium(objectId, RenderingMedium.Remote);
                        this.swapResolution(objectId, Resolution.High);
                    } else if (object.userData.originalMedium === RenderingMedium.Local) {
                        this.swapRenderingMedium(objectId, RenderingMedium.Local);
                        this.swapResolution(objectId, Resolution.Low);
                    }
                }
                sceneEl.setAttribute('local-scene', 'fps', data.lowPolyLocalFPS);
                this.swapControllers(RenderingMedium.Local);
                break;

            default:
                break;
        }
        sceneEl.emit(EVENTS.BUTTON_RESET_PRESSED, {});
    },
});
