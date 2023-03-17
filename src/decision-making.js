const LOW = 0;
const HIGH = 1;

AFRAME.registerSystem('decision-making', {
    schema: {
    },

    init: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.remoteLocal = sceneEl.systems['remote-local'];
        this.compositor = sceneEl.systems['compositor'];
        this.gui = sceneEl.systems['gui'];

        this.remoteScene = this.remoteLocal.remoteScene;
        this.remoteCamera = this.remoteLocal.remoteCamera;

        this.localScene = sceneEl.object3D;
        this.localCamera = sceneEl.camera;

        // this.tick = AFRAME.utils.throttleTick(this.tick, 10000, this);
    },

    swapToLocal(objectId) {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;

        const localSceneSys = sceneEl.components['local-scene'];
        const localObj = this.localScene.userData.objects[objectId];
        const remoteObj = this.remoteScene.userData.objects[objectId];

        if (remoteObj && localObj === undefined) {
            if (objectId !== 'background') {
                remoteObj.remove();
                localSceneSys.addToScene(objectId, remoteObj);
            }
            else {
                this.localScene.background = remoteObj.clone();
                this.localScene.environment = remoteObj.clone();
                this.remoteScene.background = null;
                this.remoteScene.environment = null;

                this.localScene.userData.objects[objectId] = remoteObj;
                this.compositor.data.preferLocal = true;
            }
            delete this.remoteScene.userData.objects[objectId];
        }
    },

    swapToRemote(objectId) {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;

        const remoteSceneSys = sceneEl.components['remote-scene'];
        const localObj = this.localScene.userData.objects[objectId];
        const remoteObj = this.remoteScene.userData.objects[objectId];

        if (localObj && remoteObj === undefined) {
            if (objectId !== 'background') {
                localObj.remove();
                remoteSceneSys.addToScene(objectId, localObj);
            }
            else {
                this.localScene.background = null;
                this.localScene.environment = null;
                this.remoteScene.background = localObj;
                this.remoteScene.environment = localObj;

                this.remoteScene.userData.objects[objectId] = localObj;
                this.compositor.data.preferLocal = false;
            }
            delete this.localScene.userData.objects[objectId];
        }
    },

    swapResolution(objectId, toHigh) {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;

        const localSceneSys = sceneEl.components['local-scene'];
        const localObj = this.localScene.userData.objects[objectId];
        const remoteObj = this.remoteScene.userData.objects[objectId];

        if (objectId.includes('model')) {
            if (toHigh && objectId.includes('high')) {
                localObj.visible = true;
            }
            else if (toHigh && objectId.includes('low')) {
                localObj.visible = false;
            }
            if (!toHigh && objectId.includes('high')) {
                localObj.visible = false;
            }
            else if (!toHigh && objectId.includes('low')) {
                localObj.visible = true;
            }
        }
    },

    changeExperiment(experiment) {
        switch (experiment) {
            case this.gui.experiments[0]: // "low poly local"
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.remoteScene.userData.objects)) {
                    this.swapToLocal(objectId);
                }
                for (const [objectId, object] of Object.entries(this.localScene.userData.objects)) {
                    this.swapResolution(objectId, LOW);
                }
                break;

            case this.gui.experiments[1]: // "high poly local"
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.remoteScene.userData.objects)) {
                    this.swapToLocal(objectId);
                }
                for (const [objectId, object] of Object.entries(this.localScene.userData.objects)) {
                    this.swapResolution(objectId, HIGH);
                }
                break;

            case this.gui.experiments[2]: // "high poly remote (no atw)"
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.localScene.userData.objects)) {
                    this.swapToRemote(objectId);
                }
                break;

            case this.gui.experiments[3]: // "high poly remote (with atw)"
                this.compositor.data.doAsyncTimeWarp = true;
                for (const [objectId, object] of Object.entries(this.localScene.userData.objects)) {
                    this.swapToRemote(objectId);
                }
                break;

            case this.gui.experiments[4]: // "mixed (no atw)"
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.localScene.userData.objects)) {
                    if (object.userData.originalMedium === 'remote') {
                        this.swapToRemote(objectId);
                    }
                }

                for (const [objectId, object] of Object.entries(this.remoteScene.userData.objects)) {
                    if (object.userData.originalMedium === 'local') {
                        this.swapToLocal(objectId);
                    }
                }
                break;

            case this.gui.experiments[5]: // "mixed (with atw)"
                this.compositor.data.doAsyncTimeWarp = true;
                for (const [objectId, object] of Object.entries(this.localScene.userData.objects)) {
                    if (object.userData.originalMedium === 'remote') {
                        this.swapToRemote(objectId);
                    }
                }

                for (const [objectId, object] of Object.entries(this.remoteScene.userData.objects)) {
                    if (object.userData.originalMedium === 'local') {
                        this.swapToLocal(objectId);
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
    //     console.log(this.localScene.userData.objects);
    //     console.log(this.remoteScene.userData.objects);
    // }
});
