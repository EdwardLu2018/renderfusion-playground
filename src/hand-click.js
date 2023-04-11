import { EVENTS, RenderingMedium, Buttons } from './constants';

AFRAME.registerComponent('hand-click', {
    schema: {

    },

    dependencies: ['interaction-manager'],

    init: function() {
        const el = this.el;
        const data = this.data;

        this.clicking = {
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

        this.clickTimeout = null;

        this.selectState = false;

        this.getContainerObjByChild = this.getContainerObjByChild.bind(this);
        this.onClickButtonLocal = this.onClickButtonLocal.bind(this);
        this.onClickButtonRemote = this.onClickButtonRemote.bind(this);
        this.onUnclickButtonLocal = this.onUnclickButtonLocal.bind(this);
        this.onUnclickButtonRemote = this.onUnclickButtonRemote.bind(this);

        el.addEventListener(EVENTS.HAND_GRAB_START_LOCAL, this.onClickButtonLocal);
        el.addEventListener(EVENTS.HAND_GRAB_START_REMOTE, this.onClickButtonRemote);
        el.addEventListener(EVENTS.HAND_GRAB_END_LOCAL, this.onUnclickButtonLocal);
        el.addEventListener(EVENTS.HAND_GRAB_END_REMOTE, this.onUnclickButtonRemote);
    },

    getContainerObjByChild(child) {
        if (child.isUI) return child;
        else if (child.parent != null) return this.getContainerObjByChild(child.parent);
        else return null;
    },

    onClickButtonLocal: function(evt) {
        const intersections = evt.detail.intersections;
        this.onClickButton(intersections, RenderingMedium.Local);
    },

    onClickButtonRemote: function(evt) {
        const intersections = evt.detail.intersections;
        this.onClickButton(intersections, RenderingMedium.Remote)
    },

    onUnclickButtonLocal: function(evt) {
        this.onUnclickButton(RenderingMedium.Local);
    },

    onUnclickButtonRemote: function(evt) {
        this.onUnclickButton(RenderingMedium.Remote)
    },

    onClickButton: function(intersections, medium) {
        const el = this.el;
        const data = this.data;

        const clicking = (medium === RenderingMedium.Local) ? this.clicking.local : this.clicking.remote;

        var i;
        var intersection;
        for (i = 0; i < intersections.length; i++) {
            intersection = this.getContainerObjByChild(intersections[i].object);
            if (intersection && intersection.isUI) {
                clicking.push({ object: intersection });
                intersection.setState( 'selected' );
            }
        }
    },

    onUnclickButton: function(medium) {
        const clicking = (medium === RenderingMedium.Local) ? this.clicking.local : this.clicking.remote;

        for (i = 0; i < clicking.length; i++) {
            clicking[i].object.setState( 'idle' );
        }

        if (medium === RenderingMedium.Local){
            this.clicking.local = [];
        } else {
            this.clicking.remote = [];
        }

    },

});
