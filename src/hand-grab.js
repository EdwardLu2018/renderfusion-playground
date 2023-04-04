import { EVENTS, RenderingMedium } from './constants';

AFRAME.registerComponent('hand-grab', {
    schema: {
        grabStartButtons: {
            default: [
                'gripdown', 'trackpaddown', 'triggerdown', 'gripclose',
                'abuttondown', 'bbuttondown', 'xbuttondown', 'ybuttondown',
                'pointup', 'thumbup', 'pointingstart', 'pistolstart',
                'thumbstickdown'
            ]
        },
        grabEndButtons: {
            default: [
                'gripup', 'trackpadup', 'triggerup', 'gripopen',
                'abuttonup', 'bbuttonup', 'xbuttonup', 'ybuttonup',
                'pointdown', 'thumbdown', 'pointingend', 'pistolend',
                'thumbstickup'
            ]
        },
    },

    dependencies: ['remote-controller'],

    init: function() {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.intersections = [];
        this.grabbing = [];

        this.remoteLocal = el.sceneEl.systems['remote-local'];
        this.compositor = el.sceneEl.systems['compositor'];

        this.remoteScene = this.remoteLocal.remoteScene;
        this.remoteCamera = this.remoteLocal.remoteCamera;

        this.localScene = el.sceneEl.object3D;
        this.localCamera = el.sceneEl.camera;

        this.grabStartTimeout = null;
        this.grabEndTimeout = null;

        this.gotIntersectedObjects = this.gotIntersectedObjects.bind(this);
        this.onGrabStartButtonHelper = this.onGrabStartButtonHelper.bind(this);
        this.onGrabEndButtonHelper = this.onGrabEndButtonHelper.bind(this);
        this.onGrabStartButton = this.onGrabStartButton.bind(this);
        this.onGrabEndButton = this.onGrabEndButton.bind(this);
        this.getContainerObjByChild = this.getContainerObjByChild.bind(this);

        el.addEventListener(EVENTS.RAYCASTER_INTERSECT, this.gotIntersectedObjects);

        data.grabStartButtons.forEach(b => {
            this.el.addEventListener(b, this.onGrabStartButtonHelper);
        });

        data.grabEndButtons.forEach(b => {
            this.el.addEventListener(b, this.onGrabEndButtonHelper);
        });
    },

    getContainerObjByChild(child) {
        if (child.userData.originalMedium) return child;
        else if (child.parent != null) return this.getContainerObjByChild(child.parent);
        else return null;
    },

    gotIntersectedObjects: function(evt) {
        this.intersections = evt.detail.intersections;
    },

    onGrabStartButtonHelper: function(evt) {
        const el = this.el;
        const data = this.data;

        const remoteControllerEnabled = el.getAttribute('remote-controller').enabled;
        const _this = this;
        if (!remoteControllerEnabled) {
            this.onGrabStartButton(this.intersections);
        }
        else {
            this.grabStartTimeout = window.setTimeout(() => {
                _this.onGrabStartButton(this.intersections);
            }, _this.remoteLocal.latency);
        }
    },

    onGrabEndButtonHelper: function(evt) {
        const el = this.el;
        const data = this.data;

        const remoteControllerEnabled = el.getAttribute('remote-controller').enabled;
        const _this = this;
        if (!remoteControllerEnabled) {
            this.onGrabEndButton(this.intersections);
        }
        else {
            this.grabEndTimeout = window.setTimeout(() => {
                _this.onGrabEndButton(this.intersections);
            }, _this.remoteLocal.latency);
        }
    },

    onGrabStartButton: function(intersections) {
        const el = this.el;
        const data = this.data;

        const remoteControllerEnabled = el.getAttribute('remote-controller').enabled;

        var i;
        var grabbed;

        // console.log('grab start');

        const objPos = new THREE.Vector3();
        const grabPos = new THREE.Vector3();

        const object3D = !remoteControllerEnabled ? el.object3D : el.remoteObject3D;

        var intersection;
        for (i = 0; i < intersections.length; i++) {
            intersection = intersections[i];

            if (!intersection.object.userData.grabbable) {
                continue;
            }

            distance = intersection.object.getWorldPosition(objPos).distanceTo(object3D.getWorldPosition(grabPos));
            this.grabbing.push({
                object: this.getContainerObjByChild(intersection.object),
            });
        }

        // for (i = 0; i < this.grabbing.length; i++) {
        //     grabbed = this.grabbing[i].object;
        //     if (grabbed.material && grabbed.material.color) grabbed.material.color.setHex( 0xffffff );
        // }
    },

    onGrabEndButton: function(intersections) {
        const el = this.el;
        const data = this.data;

        const remoteControllerEnabled = el.getAttribute('remote-controller').enabled;

        var grabbed;

        // console.log('grab end');

        const objPos = new THREE.Vector3();
        const objRot = new THREE.Quaternion();

        const object3D = !remoteControllerEnabled ? el.object3D : el.remoteObject3D;

        for (var i = 0; i < this.grabbing.length; i++) {
            grabbed = this.grabbing[i].object;

            grabbed.getWorldPosition(objPos);
            grabbed.getWorldQuaternion(objRot);

            object3D.remove(grabbed);
            if (grabbed.userData.renderingMedium === RenderingMedium.Local) {
                this.localScene.add(grabbed);
            }
            else if (grabbed.userData.renderingMedium === RenderingMedium.Remote) {
                this.remoteScene.add(grabbed);
            }
            grabbed.position.copy(objPos);
            grabbed.rotation.setFromQuaternion(objRot);

            // if (grabbed.material && grabbed.material.color) grabbed.material.color.setHex( 0x000000 );
        }

        this.grabbing = [];
        if (remoteControllerEnabled) {
            window.clearInterval(this.grabStartTimeout);
            window.clearInterval(this.grabEndTimeout);
        }
    },

    tick: function() {
        const el = this.el;
        const data = this.data;

        const remoteControllerEnabled = el.getAttribute('remote-controller').enabled;

        const object3D = !remoteControllerEnabled ? el.object3D : el.remoteObject3D;

        var grabbed;
        for (var i = 0; i < this.grabbing.length; i++) {
            grabbed = this.grabbing[i].object;
            object3D.attach(grabbed);
        }
    }
});
