import {LOW_POLY_LOCAL, HIGH_POLY_LOCAL, HIGH_POLY_REMOTE, HIGH_POLY_REMOTE_ATW, MIXED, MIXED_ATW} from './constants';

const LOW = 0;
const HIGH = 1;

const LOCAL = 0;
const REMOTE = 1;

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

        // this.tick = AFRAME.utils.throttleTick(this.tick, 10000, this);
    },

    swapRenderingMedium(objectId, renderingMediumType) {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;

        const localSceneSys = sceneEl.components['local-scene'];
        const remoteSceneSys = sceneEl.components['remote-scene'];
        const object = this.objects[objectId];

        if (renderingMediumType === LOCAL) { // swap remote to local
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
            if ((resolutionType === HIGH && objectId.includes('High')) ||
                (resolutionType == LOW && objectId.includes('Low'))) {
                model.visible = true;
            }
            else
            if ((resolutionType === HIGH && objectId.includes('Low')) ||
                (resolutionType === LOW && objectId.includes('High'))) {
                model.visible = false;
            }

            if (resolutionType === HIGH) {
                model.traverse( function( node ) {
                    if ( node.isMesh ) { node.castShadow = true; node.receiveShadow = true; }
                } );
            }
            else {
                model.traverse( function( node ) {
                    if ( node.isMesh ) { node.castShadow = false; node.receiveShadow = false; }
                } );
            }
        }
        else {
            if (resolutionType === HIGH) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
            else {
                object.castShadow = false;
                object.receiveShadow = false;
            }
        }
    },

    changeExperiment(experiment) {
        switch (experiment) {
            case LOW_POLY_LOCAL:
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    this.swapRenderingMedium(objectId, LOCAL);
                    this.swapResolution(objectId, LOW);
                }
                break;

            case HIGH_POLY_LOCAL:
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    this.swapRenderingMedium(objectId, LOCAL);
                    this.swapResolution(objectId, HIGH);
                }
                break;

            case HIGH_POLY_REMOTE:
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    this.swapRenderingMedium(objectId, REMOTE);
                }
                break;

            case HIGH_POLY_REMOTE_ATW:
                this.compositor.data.doAsyncTimeWarp = true;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    this.swapRenderingMedium(objectId, REMOTE);
                }
                break;

            case MIXED:
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    if (object.userData.originalMedium === 'remote') {
                        this.swapRenderingMedium(objectId, REMOTE);
                    }
                    else if (object.userData.originalMedium === 'local') {
                        this.swapRenderingMedium(objectId, LOCAL);
                    }
                }
                break;

            case MIXED_ATW:
                this.compositor.data.doAsyncTimeWarp = true;
                for (const [objectId, object] of Object.entries(this.objects)) {
                    if (object.userData.originalMedium === 'remote') {
                        this.swapRenderingMedium(objectId, REMOTE);
                    }
                }

                for (const [objectId, object] of Object.entries(this.objects)) {
                    if (object.userData.originalMedium === 'local') {
                        this.swapRenderingMedium(objectId, LOCAL);
                    }
                }
                break;

            default:
                break;
        }
    },

    // update(oldData) {
    //     const data = this.data;
    // },

    // tick: function () {
    //     console.log(this.objects);
    //     console.log(this.objects);
    // }
});
