import { EVENTS } from './constants';

AFRAME.registerComponent('raycaster-custom', {
    schema: {
        far: {default: 1000},
        near: {default: 0},
    },

    dependencies: ['remote-controller'],

    init: function () {
        const el = this.el;
        const data = this.data;

        this.raycaster = new THREE.Raycaster();
        this.rawIntersections = [];
        this.intersectionsLocal = [];
        this.intersectionsRemote = [];

        const sceneEl = el.sceneEl;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.remoteLocal = sceneEl.systems['remote-local'];
        this.compositor = sceneEl.systems['compositor'];
        this.experimentManager = sceneEl.systems['experiment-manager'];

        this.remoteScene = this.remoteLocal.remoteScene;
        this.remoteCamera = this.remoteLocal.remoteCamera;

        this.localScene = sceneEl.object3D;
        this.localCamera = sceneEl.camera;

        this.handLeft = document.getElementById('handLeft');
        this.handRight = document.getElementById('handRight');

        this.controllerConnected = false;
        this.controllerModelReady = false;

        const _this = this;
        el.addEventListener('controllerconnected', () => {
            _this.controllerConnected = true;
        });

        el.addEventListener('controllerdisconnected', () => {
            _this.controllerConnected = false;
        });

        el.addEventListener('controllermodelready', () => {
            _this.controllerModelReady = true;
        });
    },

	updateOriginDirection: function(object3D) {
        var direction = new THREE.Vector3();
        var originVec3 = new THREE.Vector3();

        var el = this.el;
        var data = this.data;

        const raycaster = el.getAttribute('raycaster');

        object3D.updateMatrixWorld();
        originVec3.setFromMatrixPosition(object3D.matrixWorld);

        // If non-zero origin, translate the origin into world space.
        if (raycaster.origin.x !== 0 || raycaster.origin.y !== 0 || raycaster.origin.z !== 0) {
            originVec3 = object3D.localToWorld(originVec3.copy(raycaster.origin));
        }

        // three.js raycaster direction is relative to 0, 0, 0 NOT the origin / offset we
        // provide. Apply the offset to the direction, then rotation from the object,
        // and normalize.
        direction.copy(raycaster.direction).transformDirection(object3D.matrixWorld).normalize();

        // Apply offset and direction, in world coordinates.
        this.raycaster.set(originVec3, direction);
        // this.localScene.add(new THREE.ArrowHelper(this.raycaster.ray.direction, this.raycaster.ray.origin, 300, 0xff0000) );
    },

    checkIntersections: function() {
        const el = this.el;
        const data = this.data;

        var intersection;

        const remoteControllerEnabled = el.getAttribute('remote-controller').enabled;

        var localObjects = Object.values(this.localScene.children);
        var remoteObjects = Object.values(this.remoteScene.children);

        // local intersections
        this.updateOriginDirection(el.object3D);
        this.rawIntersections.length = 0;
        this.raycaster.intersectObjects(localObjects, true, this.rawIntersections);

        this.intersectionsLocal.length = 0;
        for (var i = 0; i < this.rawIntersections.length; i++) {
            intersection = this.rawIntersections[i];
            if (intersection.object.type === 'Line') {
                continue;
            }

            this.intersectionsLocal.push(intersection);
        }

        if (this.intersectionsLocal.length > 0) {
            const intersectionDetail = {};
            intersectionDetail.intersections = this.intersectionsLocal;
            el.emit(EVENTS.RAYCASTER_INTERSECT_LOCAL, intersectionDetail);
        }

        // remote intersections
        this.updateOriginDirection(el.remoteObject3D);
        this.rawIntersections.length = 0;
        this.raycaster.intersectObjects(remoteObjects, true, this.rawIntersections);

        this.intersectionsRemote.length = 0;
        for (var i = 0; i < this.rawIntersections.length; i++) {
            intersection = this.rawIntersections[i];
            if (intersection.object.type === 'Line') {
                continue;
            }

            this.intersectionsRemote.push(intersection);
        }

        if (this.intersectionsRemote.length > 0) {
            const intersectionDetail = {};
            intersectionDetail.intersections = this.intersectionsRemote;
            el.emit(EVENTS.RAYCASTER_INTERSECT_REMOTE, intersectionDetail);
        }
	},

    update: function (oldData) {
        var data = this.data;
        var el = this.el;
        var raycaster = this.raycaster;

        // Set raycaster properties.
        raycaster.far = data.far;
        raycaster.near = data.near;
    },

    tock: function(time) {
        if (this.controllerModelReady && this.controllerConnected) {
            this.checkIntersections();
        }
    }
});
