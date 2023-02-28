AFRAME.registerSystem('local-scene', {
    schema: {
    },

    init: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        const renderer = sceneEl.renderer;

        // this is the local scene init //
        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        const boxMaterial = new THREE.MeshBasicMaterial({color: 'red'});
        const boxGeometry = new THREE.BoxGeometry(5, 5, 5);
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.x = 0;
        box.position.y = 1.6;
        box.position.z = -10;
        scene.add(box); // add to local scene
    },
});
