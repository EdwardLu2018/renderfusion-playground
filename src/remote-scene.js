AFRAME.registerComponent('remote-scene', {
    schema: {
    },

    init: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = el;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.remoteScene = sceneEl.systems['remote-local'].remoteScene;
        this.remoteCamera = sceneEl.systems['remote-local'].remoteCamera;

        // This is the remote scene init //
        const scene = this.remoteScene;
        const camera = this.remoteCamera;

        scene.background = new THREE.Color(0xF06565);

        const boxMaterial = new THREE.MeshBasicMaterial({color: 0x7074FF});
        const boxGeometry = new THREE.BoxGeometry(5, 5, 5);
        this.box1 = new THREE.Mesh(boxGeometry, boxMaterial);
        this.box2 = new THREE.Mesh(boxGeometry, boxMaterial);
        this.box1.position.x = 10; this.box2.position.x = -10;
        this.box1.position.y = this.box2.position.y = 1.6;
        this.box1.position.z = this.box2.position.z = -10;
        scene.add(this.box1); // add to remote scene
        scene.add(this.box2);

        const texture = new THREE.TextureLoader().load('./color.png');
        const geometry = new THREE.PlaneGeometry(1920, 1080, 1, 1);
        const material = new THREE.MeshBasicMaterial( { map: texture } );
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = -6;
        mesh.position.y = 1.6;
        mesh.position.z = -50;
        // mesh.rotation.x = -Math.PI / 8;
        // mesh.rotation.z = -Math.PI / 8;
        scene.add(mesh);
    },

    tick: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;

        const scene = this.remoteScene;
        const camera = this.remoteCamera;

        // this.box1.rotation.x += 0.01;
        // this.box1.rotation.y += 0.01;
        // this.box1.rotation.z += 0.01;
    }
});
