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
        this.box = new THREE.Mesh(boxGeometry, boxMaterial);
        this.box.position.x = -10;
        this.box.position.y = 1.6;
        this.box.position.z = -10;
        this.box.scale.y *= 1.5;
        scene.add(this.box); // add to local scene

        this.box2 = new THREE.Mesh(boxGeometry, boxMaterial);
        this.box2.position.x = 10;
        this.box2.position.y = 1.6;
        this.box2.position.z = -10;
        this.box2.scale.y *= 1.5;
        scene.add(this.box2); // add to local scene
    },

    tick: function () {
        // this.box.rotation.x -= 0.01;
        // this.box.rotation.y -= 0.01;
        // this.box.rotation.z -= 0.01;
    }
});
