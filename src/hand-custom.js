import {EVENTS} from './constants';

AFRAME.registerComponent('hand-custom', {
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

        this.gotIntersectedObjects = this.gotIntersectedObjects.bind(this);
        this.onGrabStartButton = this.onGrabStartButton.bind(this);
        this.onGrabEndButton = this.onGrabEndButton.bind(this);

        el.addEventListener(EVENTS.INTERSECT, this.gotIntersectedObjects);

        data.grabStartButtons.forEach(b => {
            this.el.addEventListener(b, this.onGrabStartButton);
        });

        data.grabEndButtons.forEach(b => {
            this.el.addEventListener(b, this.onGrabEndButton);
        });
    },

    gotIntersectedObjects: function (evt) {
        this.intersections = evt.detail.intersections;
    },

    onGrabStartButton: function (evt) {
        const el = this.el;
        const data = this.data;

        var i;
        var grabbed;

        console.log('grab start');

        for (i = 0; i < this.intersections.length; i++) {
            intersection = this.intersections[i];
            this.grabbing.push({object: intersection.object, distance: intersection.distance});
        }

        for (i = 0; i < this.grabbing.length; i++) {
            grabbed = this.grabbing[i].object;
            if (grabbed.material.color) grabbed.material.color.setHex( 0xffffff );
        }
    },

    onGrabEndButton: function (evt) {
        const el = this.el;
        const data = this.data;

        console.log('grab end');

        for (var i = 0; i < this.grabbing.length; i++) {
            const grabbed = this.grabbing[i].object;
            if (grabbed.material.color) grabbed.material.color.setHex( 0x000000 );
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
        var distance;
        var newPos;
        for (var i = 0; i < this.grabbing.length; i++) {
            grabbed = this.grabbing[i].object;
            distance = this.grabbing[i].distance;

            newPos = new THREE.Vector3();
            newPos.copy(direction);
            newPos
                .applyQuaternion(el.object3D.getWorldQuaternion(q))
                .setLength(distance)
                .add(el.object3D.getWorldPosition(v))
                .add(origin);

            grabbed.position.copy(newPos);
        }
    }
});
