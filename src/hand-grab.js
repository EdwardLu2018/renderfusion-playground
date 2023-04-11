import { EVENTS, RenderingMedium } from './constants';

AFRAME.registerComponent('hand-grab', {
    schema: {
        scaleUpBy: {type: 'number', default: 1.1},
    },

    dependencies: ['interaction-manager'],

    init: function() {
        const el = this.el;
        const data = this.data;

        this.grabbing = {
            local: [],
            remote: [],
        };

        const sceneEl = el.sceneEl;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.remoteLocal = el.sceneEl.systems['remote-local'];
        this.compositor = el.sceneEl.systems['compositor'];

        this.remoteScene = this.remoteLocal.remoteScene;
        this.remoteCamera = this.remoteLocal.remoteCamera;

        this.localScene = el.sceneEl.object3D;
        this.localCamera = el.sceneEl.camera;

        this.getContainerObjByChild = this.getContainerObjByChild.bind(this);
        this.gotGrabStartLocal = this.gotGrabStartLocal.bind(this);
        this.gotGrabStartRemote = this.gotGrabStartRemote.bind(this);
        this.gotGrabEndLocal = this.gotGrabEndLocal.bind(this);
        this.gotGrabEndRemote = this.gotGrabEndRemote.bind(this);

        el.addEventListener(EVENTS.HAND_GRAB_START_LOCAL, this.gotGrabStartLocal);
        el.addEventListener(EVENTS.HAND_GRAB_START_REMOTE, this.gotGrabStartRemote);
        el.addEventListener(EVENTS.HAND_GRAB_END_LOCAL, this.gotGrabEndLocal);
        el.addEventListener(EVENTS.HAND_GRAB_END_REMOTE, this.gotGrabEndRemote);
    },

    getContainerObjByChild(child) {
        if (child.userData.originalMedium) return child;
        else if (child.parent != null) return this.getContainerObjByChild(child.parent);
        else return null;
    },

    gotGrabStartLocal: function(evt) {
        const intersections = evt.detail.intersections;
        this.onGrabStartButton(intersections, RenderingMedium.Local);
    },

    gotGrabStartRemote: function(evt) {
        const intersections = evt.detail.intersections;
        this.onGrabStartButton(intersections, RenderingMedium.Remote);
    },

    gotGrabEndLocal: function(evt) {
        this.onGrabEndButton(RenderingMedium.Local);
    },

    gotGrabEndRemote: function(evt) {
        this.onGrabEndButton(RenderingMedium.Remote);
    },

    onGrabStartButton: function(intersections, medium) {
        const el = this.el;
        const data = this.data;

        // console.log('grab start');
        const grabbing = (medium === RenderingMedium.Local) ? this.grabbing.local : this.grabbing.remote;

        var i;
        var intersection;
        for (i = 0; i < intersections.length; i++) {
            intersection = intersections[i];

            if (!intersection.object.userData.grabbable) {
                continue;
            }

            intersection = this.getContainerObjByChild(intersection.object);
            grabbing.push({ object: intersection });
        }

        for (i = 0; i < grabbing.length; i++) {
            grabbed = grabbing[i].object;
            grabbed.scale.multiplyScalar(data.scaleUpBy);
            // if (grabbed.material && grabbed.material.color) grabbed.material.color.setHex( 0xffffff );
        }
    },

    onGrabEndButton: function(medium) {
        const el = this.el;
        const data = this.data;

        const remoteControllerEnabled = el.getAttribute('remote-controller').enabled;

        // console.log('grab end');
        const grabbing = (medium === RenderingMedium.Local) ? this.grabbing.local : this.grabbing.remote;

        const objPos = new THREE.Vector3();
        const objRot = new THREE.Quaternion();

        const object3D = !remoteControllerEnabled ? el.object3D : el.remoteObject3D;

        var i;
        var grabbed;
        for (i = 0; i < grabbing.length; i++) {
            grabbed = grabbing[i].object;

            grabbed.getWorldPosition(objPos);
            grabbed.getWorldQuaternion(objRot);

            object3D.remove(grabbed);
            if (grabbed.userData.renderingMedium === RenderingMedium.Local) {
                this.localScene.add(grabbed);
            } else if (grabbed.userData.renderingMedium === RenderingMedium.Remote) {
                this.remoteScene.add(grabbed);
            }
            grabbed.position.copy(objPos);
            grabbed.rotation.setFromQuaternion(objRot);

            grabbed.scale.multiplyScalar(1 / data.scaleUpBy);
            // if (grabbed.material && grabbed.material.color) grabbed.material.color.setHex( 0x000000 );
        }

        if (medium === RenderingMedium.Local) {
            this.grabbing.local = [];
        } else if (medium === RenderingMedium.Remote) {
            this.grabbing.remote = [];
        }
    },

    tick: function() {
        const el = this.el;
        const data = this.data;

        const remoteControllerEnabled = el.getAttribute('remote-controller').enabled;

        const object3D = !remoteControllerEnabled ? el.object3D : el.remoteObject3D;

        var i;
        var grabbed;
        for (i = 0; i < this.grabbing.local.length; i++) {
            grabbed = this.grabbing.local[i].object;
            object3D.attach(grabbed);
        }
        for (i = 0; i < this.grabbing.remote.length; i++) {
            grabbed = this.grabbing.remote[i].object;
            object3D.attach(grabbed);
        }
    }
});
