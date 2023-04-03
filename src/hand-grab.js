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

    init: function () {
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

        this.gotIntersectedObjects = this.gotIntersectedObjects.bind(this);
        this.onGrabStartButton = this.onGrabStartButton.bind(this);
        this.onGrabEndButton = this.onGrabEndButton.bind(this);
        this.getContainerObjByChild = this.getContainerObjByChild.bind(this);

        el.addEventListener(EVENTS.INTERSECT, this.gotIntersectedObjects);

        data.grabStartButtons.forEach(b => {
            this.el.addEventListener(b, this.onGrabStartButton);
        });

        data.grabEndButtons.forEach(b => {
            this.el.addEventListener(b, this.onGrabEndButton);
        });
    },

    getContainerObjByChild(child) {
        if (child.userData.originalMedium) return child;
        else if (child.parent != null) return this.getContainerObjByChild(child.parent);
        else return null;
    },

    gotIntersectedObjects: function (evt) {
        this.intersections = evt.detail.intersections;
    },

    onGrabStartButton: function (evt) {
        const el = this.el;
        const data = this.data;

        const remoteControllerEnabled = el.getAttribute('remote-controller').enabled;

        var i;
        var grabbed;
        var distance;

        // console.log('grab start');

        const objPos = new THREE.Vector3();
        const grabPos = new THREE.Vector3();

        var object3D = !remoteControllerEnabled ? el.object3D : el.remoteObject3D;

        const _this = this;
        for (i = 0; i < this.intersections.length; i++) {
            intersection = this.intersections[i];

            if (!intersection.object.userData.grabbable) {
                continue;
            }

            distance = intersection.object.getWorldPosition(objPos).distanceTo(object3D.getWorldPosition(grabPos));
            if (intersection.object.userData.renderingMedium == RenderingMedium.Local) {
                this.grabbing.push({
                    object: this.getContainerObjByChild(intersection.object),
                    distance: distance,
                });
            }
            else if (intersection.object.userData.renderingMedium == RenderingMedium.Remote) {
                const object = intersection.object;
                window.setTimeout(() => {
                    _this.grabbing.push({
                        object: this.getContainerObjByChild(object),
                        distance: distance,
                    });
                }, _this.remoteLocal.latency);
            }
        }

        // for (i = 0; i < this.grabbing.length; i++) {
        //     grabbed = this.grabbing[i].object;
        //     // if (grabbed.material && grabbed.material.color) grabbed.material.color.setHex( 0xffffff );
        // }
    },

    onGrabEndButton: function (evt) {
        const el = this.el;
        const data = this.data;

        const remoteControllerEnabled = el.getAttribute('remote-controller').enabled;

        var grabbed;

        // console.log('grab end');

        const objPos = new THREE.Vector3();
        const objRot = new THREE.Quaternion();

        var object3D = !remoteControllerEnabled ? el.object3D : el.remoteObject3D;

        const _this = this;
        for (var i = 0; i < this.grabbing.length; i++) {
            grabbed = this.grabbing[i].object;

            grabbed.getWorldPosition(objPos);
            grabbed.getWorldQuaternion(objRot);

            if (grabbed.userData.renderingMedium === RenderingMedium.Local) {
                object3D.remove(grabbed);
                this.localScene.add(grabbed);
                grabbed.position.copy(objPos);
                grabbed.rotation.setFromQuaternion(objRot);
            }
            else if (grabbed.userData.renderingMedium === RenderingMedium.Remote) {
                const object = grabbed;
                window.setTimeout(() => {
                    object3D.remove(object);
                    _this.remoteScene.add(object);
                    object.position.copy(objPos);
                    object.rotation.setFromQuaternion(objRot);
                }, _this.remoteLocal.latency);
            }

            // if (grabbed.material && grabbed.material.color) grabbed.material.color.setHex( 0x000000 );
        }

        this.grabbing = [];
    },

    tick: function () {
        const el = this.el;
        const data = this.data;

        const q = new THREE.Quaternion();
        const v = new THREE.Vector3();

        const raycaster = el.getAttribute('raycaster');
        const origin = raycaster.origin;
        const direction = raycaster.direction;

        var grabbed;
        var object3D;
        for (var i = 0; i < this.grabbing.length; i++) {
            grabbed = this.grabbing[i].object;
            distance = this.grabbing[i].distance;

            object3D = el.object3D;
            if (el.getAttribute('remote-controller').enabled) {
                object3D = el.remoteObject3D;
            }

            object3D.attach(grabbed);
        }
    }
});
