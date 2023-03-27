import { EVENTS } from './constants';

const mouse = new THREE.Vector2();
mouse.x = mouse.y = null;

window.addEventListener( 'pointermove', ( event ) => {
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
} );

AFRAME.registerComponent('raycaster-custom', {
    schema: {
        far: {default: 1000},
        near: {default: 0},
    },

    init: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;

        this.raycaster = new THREE.Raycaster();
        this.rawIntersections = [];
        this.intersections = [];

        this.remoteLocal = sceneEl.systems['remote-local'];
        this.compositor = sceneEl.systems['compositor'];
        this.experimentManager = sceneEl.systems['experiment-manager'];

        this.remoteScene = this.remoteLocal.remoteScene;
        this.remoteCamera = this.remoteLocal.remoteCamera;

        this.localScene = sceneEl.object3D;
        this.localCamera = sceneEl.camera;

        this.handLeft = document.getElementById('handLeft');
        this.handRight = document.getElementById('handRight');

        this.intersectionDetail = {};

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

	updateOriginDirection: (function() {
        var direction = new THREE.Vector3();
        var originVec3 = new THREE.Vector3();

        return function updateOriginDirection () {
            // this.raycaster.setFromCamera( mouse, this.localCamera );

            var el = this.el;
            var data = this.data;

            const raycaster = el.getAttribute('raycaster');

            el.object3D.updateMatrixWorld();
            originVec3.setFromMatrixPosition(el.object3D.matrixWorld);

            // If non-zero origin, translate the origin into world space.
            if (raycaster.origin.x !== 0 || raycaster.origin.y !== 0 || raycaster.origin.z !== 0) {
                originVec3 = el.object3D.localToWorld(originVec3.copy(raycaster.origin));
            }

            // three.js raycaster direction is relative to 0, 0, 0 NOT the origin / offset we
            // provide. Apply the offset to the direction, then rotation from the object,
            // and normalize.
            direction.copy(raycaster.direction).transformDirection(el.object3D.matrixWorld).normalize();

            // Apply offset and direction, in world coordinates.
            this.raycaster.set(originVec3, direction);
            // this.localScene.add(new THREE.ArrowHelper(this.raycaster.ray.direction, this.raycaster.ray.origin, 300, 0xff0000) );
          };
    })(),

    checkIntersections: function() {
        const el = this.el;
        const data = this.data;

        var intersection;

        const objects = Object.values(this.localScene.children);

        this.updateOriginDirection();
        this.rawIntersections.length = 0;
        this.raycaster.intersectObjects(objects, true, this.rawIntersections);

        this.intersections.length = 0;
        for (var i = 0; i < this.rawIntersections.length; i++) {
            intersection = this.rawIntersections[i];
            if (intersection.object === this.handLeft.getObject3D('line') ||
                intersection.object === this.handRight.getObject3D('line')) {
                continue;
            }

            if (!intersection.object.userData.grabbable) {
                continue;
            }

            this.intersections.push(intersection);
        }

        this.intersectionDetail.intersections = this.intersections;
        if (this.intersections.length > 0) {
            el.emit(EVENTS.INTERSECT, this.intersectionDetail);
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
