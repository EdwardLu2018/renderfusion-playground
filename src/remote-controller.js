AFRAME.registerComponent('remote-controller', {
    schema: {
        fps: {type: 'number', default: 90},
        enabled: {type: 'bool', default: false},
        latency: {type: 'number', default: 150}, // ms
    },

    init: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.elapsed = 0;
        this.clock = new THREE.Clock();

        this.poses = [];

        const _this = this;
        el.addEventListener('controllermodelready', () => {
            _this.remoteLocal = sceneEl.systems['remote-local'];
            _this.remoteScene = _this.remoteLocal.remoteScene;
            _this.remoteCamera = _this.remoteLocal.remoteCamera;

            _this.remoteObject3D = el.object3D.clone();
            _this.remoteScene.add(_this.remoteObject3D);
        });
    },

    tick: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = el.sceneEl;
        const renderer = sceneEl.renderer;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        if (this.remoteObject3D === undefined) return;
        if (data.enabled === true) {
            this.remoteObject3D.visible = true;
            el.object3D.visible = false;
        }
        else {
            this.remoteObject3D.visible = false;
            el.object3D.visible = true;
            return;
        }
        if (data.latency === -1) return;

        this.elapsed += this.clock.getDelta() * 1000;
        if (this.elapsed > 1000 / data.fps) {
            this.elapsed = 0;

            var pose = new THREE.Matrix4();
            pose.copy(el.object3D.matrixWorld);
            this.poses.push({pose: pose, timestamp: performance.now()});

            if (this.poses.length > 1 &&
                performance.now() >= this.poses[0].timestamp + this.latency) {
                const prevPose = this.poses.shift().pose;

                // update remote controller
                this.remoteObject3D.matrixWorld.copy( prevPose );
                this.remoteObject3D.matrixWorld.decompose(
                        this.remoteObject3D.position,
                        this.remoteObject3D.quaternion,
                        this.remoteObject3D.scale
                    );
            }
        }
    }
});
