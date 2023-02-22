const MAX_LENGTH = 1000;

AFRAME.registerSystem('delay', {
    init: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        const renderer = sceneEl.renderer;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        this.dummy = document.getElementById('dummy').object3D;

        this.plane = document.createElement('a-image');
        this.plane.setAttribute('id', 'my-plane');
        this.plane.setAttribute('material', 'src', '#my-image');
        // this.plane.setAttribute('position', '0 2 -100');
        this.plane.setAttribute('width', '288');
        this.plane.setAttribute('height', '180');
        sceneEl.appendChild(this.plane);

        this.poses = [];

        this.tick = AFRAME.utils.throttleTick(this.tick, 5000 , this);
    },

    tick: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        // var dummyWorldPos = new THREE.Vector3();
        // var dummyWorldRot = new THREE.Quaternion();
        // dummyWorldRot.setFromRotationMatrix(camera.matrixWorld);
        // dummyWorldPos.setFromMatrixPosition(camera.matrixWorld);

        this.poses.push(this.dummy.matrixWorld);
        // if (this.poses.length > MAX_LENGTH) {
            const pose = this.poses.shift();
            this.plane.object3D.rotation.setFromRotationMatrix(pose);
            this.plane.object3D.position.setFromMatrixPosition(pose);
        // }
    }
});
