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

        const localScene = sceneEl.components['local-scene'];
        const localObj = this.localScene.userData.objects[objectId];
        const remoteObj = this.remoteScene.userData.objects[objectId];

        if (remoteObj && localObj === undefined) {
            remoteObj.remove();
            localScene.addToScene(objectId, remoteObj);
            delete this.remoteScene.userData.objects[objectId];
        }
    },

    swapToRemote(objectId) {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;

        const remoteScene = sceneEl.components['remote-scene'];
        const localObj = this.localScene.userData.objects[objectId];
        const remoteObj = this.remoteScene.userData.objects[objectId];

        if (localObj && remoteObj === undefined) {
            localObj.remove();
            remoteScene.addToScene(objectId, localObj);
            delete this.localScene.userData.objects[objectId];
        }
    },

    swapRenderingMedium(objectId) {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;

        const localObj = this.localScene.userData.objects[objectId];
        const remoteObj = this.remoteScene.userData.objects[objectId];

        if (localObj && remoteObj === undefined) {
            this.swapToRemote(objectId);
        }
        else if (remoteObj && localObj === undefined) {
            this.swapToLocal(objectId);
        }
    },

    changeExperiment(experiment) {
        switch (experiment) {
            case this.gui.experiments[0]: // "low poly local"
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.remoteScene.userData.objects)) {
                    this.swapToLocal(objectId);
                }
                break;

            case this.gui.experiments[1]: // "high poly local"
                this.compositor.data.doAsyncTimeWarp = false;
                for (const [objectId, object] of Object.entries(this.remoteScene.userData.objects)) {
                    this.swapToLocal(objectId);
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
                    console.log(object.userData.originalMedium)
                    if (object.userData.originalMedium === 'remote') {
                        this.swapToRemote(objectId);
                    }
                }

                for (const [objectId, object] of Object.entries(this.remoteScene.userData.objects)) {
                    console.log(object.userData.originalMedium)
                    if (object.userData.originalMedium === 'local') {
                        this.swapToLocal(objectId);
                    }
                }
                break;

            case this.gui.experiments[5]: // "mixed (with atw)"
                this.compositor.data.doAsyncTimeWarp = true;
                for (const [objectId, object] of Object.entries(this.localScene.userData.objects)) {
                    console.log(object.userData.originalMedium)
                    if (object.userData.originalMedium === 'remote') {
                        this.swapToRemote(objectId);
                    }
                }

                for (const [objectId, object] of Object.entries(this.remoteScene.userData.objects)) {
                    console.log(object.userData.originalMedium)
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
