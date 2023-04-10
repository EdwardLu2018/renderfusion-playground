import { EVENTS } from './constants';

AFRAME.registerComponent('interaction-manager', {
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

        this.intersections = {
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

    gotIntersectedObjectsLocal: function(evt) {
        this.intersections.local = evt.detail.intersections;
    },

    gotIntersectedObjectsRemote: function(evt) {
        this.intersections.remote = evt.detail.intersections;
    },

    onGrabStartButtonHelper: function(evt) {
        const el = this.el;
        const data = this.data;

        el.emit(EVENTS.HAND_GRAB_START_LOCAL, { intersections: this.intersections.local });

        window.clearInterval(this.grabStartTimeout);
        this.grabStartTimeout = window.setTimeout(() => {
            const intersections = this.intersections.remote;
            el.emit(EVENTS.HAND_GRAB_START_REMOTE, { intersections: intersections });
        }, this.remoteLocal.latency);
    },

    onGrabEndButtonHelper: function(evt) {
        const el = this.el;
        const data = this.data;

        el.emit(EVENTS.HAND_GRAB_END_LOCAL, {});

        window.clearInterval(this.grabEndTimeout);
        this.grabEndTimeout = window.setTimeout(() => {
            el.emit(EVENTS.HAND_GRAB_END_REMOTE, {});
        }, this.remoteLocal.latency);
    },
});
