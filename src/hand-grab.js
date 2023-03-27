import { scenes } from 'aframe';
import { EVENTS } from './constants';

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

    init: function () {
        const el = this.el;
        const data = this.data;

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

        var i;
        var grabbed;
        var distance;

        console.log('grab start');

        const objPos = new THREE.Vector3();
        const grabPos = new THREE.Vector3();

        for (i = 0; i < this.intersections.length; i++) {
            intersection = this.intersections[i];
            distance = intersection.object.getWorldPosition(objPos).distanceTo(el.object3D.getWorldPosition(grabPos));
            this.grabbing.push({
                object: this.getContainerObjByChild(intersection.object),
                distance: distance,
            });
        }

        for (i = 0; i < this.grabbing.length; i++) {
            grabbed = this.grabbing[i].object;
            // if (grabbed.material && grabbed.material.color) grabbed.material.color.setHex( 0xffffff );
        }
    },

    onGrabEndButton: function (evt) {
        const el = this.el;
        const data = this.data;

        console.log('grab end');

        var grabbed;
        const objPos = new THREE.Vector3();
        const objRot = new THREE.Quaternion();

        for (var i = 0; i < this.grabbing.length; i++) {
            grabbed = this.grabbing[i].object;
            grabbed.getWorldPosition(objPos);
            grabbed.getWorldQuaternion(objRot);

            el.object3D.remove(grabbed);
            if (grabbed.userData.renderingMedium === 'local') {
                this.localScene.add(grabbed);
            }
            else if (grabbed.userData.renderingMedium === 'remote') {
                this.remoteScene.add(grabbed);
            }

            grabbed.position.copy(objPos);
            grabbed.rotation.setFromQuaternion(objRot);

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
        for (var i = 0; i < this.grabbing.length; i++) {
            grabbed = this.grabbing[i].object;
            distance = this.grabbing[i].distance;

            el.object3D.attach(grabbed);
        }
    }
});
