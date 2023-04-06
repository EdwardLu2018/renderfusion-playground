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
        scaleUpBy: {type: 'number', default: 1.1},
    },

    dependencies: ['remote-controller'],

    init: function() {
        const el = this.el;
        const data = this.data;

        this.intersections = {
            local: [],
            remote: [],
        };
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

        this.grabStartTimeout = null;
        this.grabEndTimeout = null;

        this.getContainerObjByChild = this.getContainerObjByChild.bind(this);
        this.gotIntersectedObjectsLocal = this.gotIntersectedObjectsLocal.bind(this);
        this.gotIntersectedObjectsRemote = this.gotIntersectedObjectsRemote.bind(this);
        this.onGrabStartButtonHelper = this.onGrabStartButtonHelper.bind(this);
        this.onGrabEndButtonHelper = this.onGrabEndButtonHelper.bind(this);

        el.addEventListener(EVENTS.RAYCASTER_INTERSECT_LOCAL, this.gotIntersectedObjectsLocal);
        el.addEventListener(EVENTS.RAYCASTER_INTERSECT_REMOTE, this.gotIntersectedObjectsRemote);

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

    gotIntersectedObjectsLocal: function(evt) {
        this.intersections.local = evt.detail.intersections;
    },

    gotIntersectedObjectsRemote: function(evt) {
        this.intersections.remote = evt.detail.intersections;
    },

    onGrabStartButtonHelper: function(evt) {
        const el = this.el;
        const data = this.data;

        this.onGrabStartButton(this.intersections.local, RenderingMedium.Local);

        const _this = this;
        window.clearInterval(this.grabStartTimeout);
        this.grabStartTimeout = window.setTimeout(() => {
            const intersections = this.intersections.remote;
            _this.onGrabStartButton(intersections, RenderingMedium.Remote);
        }, this.remoteLocal.latency);
    },

    onGrabEndButtonHelper: function(evt) {
        const el = this.el;
        const data = this.data;

        this.onGrabEndButton(RenderingMedium.Local);

        const _this = this;
        window.clearInterval(this.grabEndTimeout);
        this.grabEndTimeout = window.setTimeout(() => {
            _this.onGrabEndButton(RenderingMedium.Remote);
        }, this.remoteLocal.latency);
    },

    onGrabStartButton: function(intersections, medium) {
        const el = this.el;
        const data = this.data;

        // console.log('grab start');
        var grabbing;
        if (medium == RenderingMedium.Local) {
            grabbing = this.grabbing.local;
        }
        else if (medium == RenderingMedium.Remote) {
            grabbing = this.grabbing.remote;
        }

        var i;
        var intersection;
        for (i = 0; i < intersections.length; i++) {
            intersection = intersections[i];

            if (!intersection.object.userData.grabbable) {
                continue;
            }

            grabbing.push({
                object: this.getContainerObjByChild(intersection.object),
            });
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

        var grabbed;

        // console.log('grab end');
        var grabbing;
        if (medium == RenderingMedium.Local) {
            grabbing = this.grabbing.local;
        }
        else if (medium == RenderingMedium.Remote) {
            grabbing = this.grabbing.remote;
        }

        const objPos = new THREE.Vector3();
        const objRot = new THREE.Quaternion();

        const object3D = !remoteControllerEnabled ? el.object3D : el.remoteObject3D;

        for (var i = 0; i < grabbing.length; i++) {
            grabbed = grabbing[i].object;

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

            grabbed.scale.multiplyScalar(1 / data.scaleUpBy);
            // if (grabbed.material && grabbed.material.color) grabbed.material.color.setHex( 0x000000 );
        }

        if (medium == RenderingMedium.Local) {
            this.grabbing.local = [];
        }
        else if (medium == RenderingMedium.Remote) {
            this.grabbing.remote = [];
            window.clearInterval(this.grabStartTimeout);
            window.clearInterval(this.grabEndTimeout);
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
