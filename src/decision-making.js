import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier';

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

        this.remoteScene = this.remoteLocal.remoteScene;
        this.remoteCamera = this.remoteLocal.remoteCamera;

        this.localScene = sceneEl.object3D;
        this.localCamera = sceneEl.camera;

        this.tick = AFRAME.utils.throttleTick(this.tick, 10000, this);
    },

    swapRenderingMedium(objectId) {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;

        const localScene = sceneEl.components['local-scene'];
        const remoteScene = sceneEl.components['remote-scene'];

        const localObj = this.localScene.userData.objects[objectId];
        const remoteObj = this.remoteScene.userData.objects[objectId];

        if (localObj && remoteObj === undefined) {
            localObj.remove();
            remoteScene.addToScene(objectId, localObj);
            delete this.localScene.userData.objects[objectId];
        }
        else if (remoteObj && localObj === undefined) {
            remoteObj.remove();
            localScene.addToScene(objectId, remoteObj);
            delete this.remoteScene.userData.objects[objectId];
        }
    },

    update(oldData) {
        const data = this.data;
    },

    tick: function () {
        console.log(this.localScene.userData.objects);
        console.log(this.remoteScene.userData.objects);
    }
});
