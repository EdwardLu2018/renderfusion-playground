import { Experiments, RenderingMedium, Resolution } from './constants';

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

        this.remoteLocal = sceneEl.systems['remote-local'];
        this.compositor = sceneEl.systems['compositor'];

        this.remoteScene = this.remoteLocal.remoteScene;
        this.remoteCamera = this.remoteLocal.remoteCamera;

        this.localScene = sceneEl.object3D;
        this.localCamera = sceneEl.camera;
    },

    swapRenderingMedium(objectId, renderingMediumType) {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;

        const localSceneSys = sceneEl.components['local-scene'];
        const remoteSceneSys = sceneEl.components['remote-scene'];
        const object = this.objects[objectId];

        if (renderingMediumType === RenderingMedium.Local) { // swap remote to local
            if (object.userData.renderingMedium === 'remote') {
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
            if (object.userData.renderingMedium === 'local') {
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

            // if (resolutionType === Resolution.High) {
            //     model.traverse( function( node ) {
            //         if ( node.isMesh ) { node.castShadow = true; node.receiveShadow = true; }
            //     } );
            // }
            // else {
            //     model.traverse( function( node ) {
            //         if ( node.isMesh ) { node.castShadow = false; node.receiveShadow = false; }
            //     } );
            // }
        }
        else {
            // if (resolutionType === Resolution.High) {
            //     object.castShadow = true;
            //     object.receiveShadow = true;
            // }
            // else {
            //     object.castShadow = false;
            //     object.receiveShadow = false;
            // }
        }
    },

    changeExperiment(experiment) {
        switch (experiment) {
            case Experiments.LowPolyLocal:
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    this.swapRenderingMedium(objectId, RenderingMedium.Local);
                    this.swapResolution(objectId, Resolution.Low);
                }
                break;

            case Experiments.HighPolyLocal:
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    this.swapRenderingMedium(objectId, RenderingMedium.Local);
                    this.swapResolution(objectId, Resolution.High);
                }
                break;

            case Experiments.HighPolyRemote:
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    this.swapRenderingMedium(objectId, RenderingMedium.Remote);
                    this.swapResolution(objectId, Resolution.High);
                }
                break;

            case Experiments.HighPolyRemoteATW:
                this.compositor.data.doAsyncTimeWarp = true;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    this.swapRenderingMedium(objectId, RenderingMedium.Remote);
                    this.swapResolution(objectId, Resolution.High);
                }
                break;

            case Experiments.Mixed:
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    if (object.userData.originalMedium === 'remote') {
                        this.swapRenderingMedium(objectId, RenderingMedium.Remote);
                        this.swapResolution(objectId, Resolution.High);
                    }
                    else if (object.userData.originalMedium === 'local') {
                        if (!objectId.includes('model')) {
                            this.swapRenderingMedium(objectId, RenderingMedium.Local);
                            this.swapResolution(objectId, Resolution.Low);
                        }
                        else {
                            this.swapRenderingMedium(objectId, RenderingMedium.Remote);
                        }
                    }
                }
                break;

            case Experiments.MixedATW:
                this.compositor.data.doAsyncTimeWarp = true;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    if (object.userData.originalMedium === 'remote') {
                        this.swapRenderingMedium(objectId, RenderingMedium.Remote);
                        this.swapResolution(objectId, Resolution.High);
                    }
                    else if (object.userData.originalMedium === 'local') {
                        if (!objectId.includes('model')) {
                            this.swapRenderingMedium(objectId, RenderingMedium.Local);
                            this.swapResolution(objectId, Resolution.Low);
                        }
                        else {
                            this.swapRenderingMedium(objectId, RenderingMedium.Remote);
                        }
                    }
                }
                break;

            default:
                break;
        }
    },
});
