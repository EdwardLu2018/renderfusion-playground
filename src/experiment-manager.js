import { Experiments, RenderingMedium, Resolution } from './constants';

import ThreeMeshUI from 'three-mesh-ui';

import FontJSON from '/assets/fonts/Roboto-msdf.json';
import FontImage from '/assets/fonts/Roboto-msdf.png';

AFRAME.registerSystem('experiment-manager', {
    schema: {
    },

    init: function () {
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

        const buttonOptions = {
            width: 1.0,
            height: 0.15,
            justifyContent: 'center',
            offset: 0.05,
            margin: 0.02,
            borderRadius: 0.075
        };

        const block1 = new ThreeMeshUI.Block( buttonOptions );
        const block2 = new ThreeMeshUI.Block( buttonOptions );

        block1.add( new ThreeMeshUI.Text( { content: 'Current Experiment:' } ) );
        this.experimentText = new ThreeMeshUI.Text( { content: '' });
        block2.add( this.experimentText );

        this.infoBlock = new ThreeMeshUI.Block( {
            justifyContent: 'center',
            contentDirection: 'column',
            fontFamily: FontJSON,
            fontTexture: FontImage,
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11
        } );
        this.infoBlock.add(block1, block2);
        this.infoBlock.scale.set(1, 1, 1);
        this.infoBlock.position.set(2, 1.2, -1);
        this.infoBlock.rotation.set(0, -Math.PI / 4, 0);
        this.localScene.add(this.infoBlock);
        this.infoBlock.userData.originalMedium = RenderingMedium.Local;
        this.infoBlock.userData.renderingMedium = RenderingMedium.Local;
        this.objects['experiment-text'] = this.infoBlock;
    },

    swapRenderingMedium(objectId, renderingMediumType) {
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
            }
            else if (objectId === 'background') {
                this.localScene.background = object;
                this.localScene.environment = object;
                this.remoteScene.background = null;
                this.remoteScene.environment = null;
                this.compositor.data.preferLocal = true;
            }
        }
        else { // swap local to remote
            if (object.userData.renderingMedium === RenderingMedium.Local) {
                object.remove();
                remoteSceneSys.addToScene(objectId, object);
            }
            else if (objectId === 'background') {
                this.localScene.background = null;
                this.localScene.environment = null;
                this.remoteScene.background = object;
                this.remoteScene.environment = object;
                this.compositor.data.preferLocal = false;
            }
        }
    },

    swapControllers(renderingMediumType) {
        const handLeft = document.getElementById('handLeft');
        const handRight = document.getElementById('handRight');
        if (renderingMediumType === RenderingMedium.Local) {
            handLeft.setAttribute('remote-controller', 'enabled', false);
            handRight.setAttribute('remote-controller', 'enabled', false);
        }
        else if (renderingMediumType === RenderingMedium.Remote) {
            handLeft.setAttribute('remote-controller', 'enabled', true);
            handRight.setAttribute('remote-controller', 'enabled', true);
        }
    },

    swapResolution(objectId, resolutionType) {
        const object = this.objects[objectId];

        if (objectId.includes('model')) {
            const model = object;
            if ((resolutionType === Resolution.High && objectId.includes('High')) ||
                (resolutionType == Resolution.Low && objectId.includes('Low'))) {
                model.visible = true;
            }
            else
            if ((resolutionType === Resolution.High && objectId.includes('Low')) ||
                (resolutionType === Resolution.Low && objectId.includes('High'))) {
                model.visible = false;
            }
        }
    },

    changeExperiment(experiment) {
        this.experiment = experiment;
        this.experimentText.set( { content: this.experiment } );

        switch (this.experiment) {
            case Experiments.LowPolyLocal:
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    this.swapRenderingMedium(objectId, RenderingMedium.Local);
                    this.swapResolution(objectId, Resolution.Low);
                }
                this.swapControllers(RenderingMedium.Local);
                break;

            case Experiments.HighPolyLocal:
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    this.swapRenderingMedium(objectId, RenderingMedium.Local);
                    this.swapResolution(objectId, Resolution.High);
                }
                this.swapControllers(RenderingMedium.Local);
                break;

            case Experiments.HighPolyRemote:
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    this.swapRenderingMedium(objectId, RenderingMedium.Remote);
                    this.swapResolution(objectId, Resolution.High);
                }
                this.swapControllers(RenderingMedium.Remote);
                break;

            case Experiments.HighPolyRemoteATW:
                this.compositor.data.doAsyncTimeWarp = true;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    this.swapRenderingMedium(objectId, RenderingMedium.Remote);
                    this.swapResolution(objectId, Resolution.High);
                }
                this.swapControllers(RenderingMedium.Remote);
                break;

            case Experiments.Mixed:
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    if (object.userData.originalMedium === RenderingMedium.Remote) {
                        this.swapRenderingMedium(objectId, RenderingMedium.Remote);
                        this.swapResolution(objectId, Resolution.High);
                    }
                    else if (object.userData.originalMedium === RenderingMedium.Local) {
                        if (!objectId.includes('model')) {
                            this.swapRenderingMedium(objectId, RenderingMedium.Local);
                            this.swapResolution(objectId, Resolution.Low);
                        }
                        else {
                            this.swapRenderingMedium(objectId, RenderingMedium.Remote);
                        }
                    }
                }
                this.swapControllers(RenderingMedium.Local);
                break;

            case Experiments.MixedATW:
                this.compositor.data.doAsyncTimeWarp = true;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    if (object.userData.originalMedium === RenderingMedium.Remote) {
                        this.swapRenderingMedium(objectId, RenderingMedium.Remote);
                        this.swapResolution(objectId, Resolution.High);
                    }
                    else if (object.userData.originalMedium === RenderingMedium.Local) {
                        if (!objectId.includes('model')) {
                            this.swapRenderingMedium(objectId, RenderingMedium.Local);
                            this.swapResolution(objectId, Resolution.Low);
                        }
                        else {
                            this.swapRenderingMedium(objectId, RenderingMedium.Remote);
                        }
                    }
                }
                this.swapControllers(RenderingMedium.Local);
                break;

            default:
                break;
        }
    },
});
