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

        this.remoteScene = sceneEl.systems['remote-local'].remoteScene;
        this.remoteCamera = sceneEl.systems['remote-local'].remoteCamera;

        this.localScene = sceneEl.object3D;
        this.localCamera = sceneEl.camera;

        this.tick = AFRAME.utils.throttleTick(this.tick, 5000, this);
    },

    update(oldData) {
        const data = this.data;
    },

    tick: function () {
        console.log(this.localScene.children)
        console.log(this.remoteScene.children)
    }
});
