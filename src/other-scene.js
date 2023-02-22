const FPS_PERIOD_60Hz = (1 / 60 * 1000);

AFRAME.registerSystem('other-scene', {
    schema: {
        fps: {type: 'number', default: 60},
        delay: {type: 'number', default: 200}, // ms
    },

    init: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;
        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.tick = AFRAME.utils.throttleTick(this.tick, 1 / data.fps * 1000, this);

        const renderer = sceneEl.renderer;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        this.otherRenderTarget = new THREE.WebGLRenderTarget(1,1);
        this.otherRenderTarget.texture.name = 'EffectComposer.rt1';
        this.otherRenderTarget.texture.minFilter = THREE.NearestFilter;
        this.otherRenderTarget.texture.magFilter = THREE.NearestFilter;
        this.otherRenderTarget.stencilBuffer = false;
        this.otherRenderTarget.depthTexture = new THREE.DepthTexture();
        this.otherRenderTarget.depthTexture.format = THREE.DepthFormat;
        this.otherRenderTarget.depthTexture.type = THREE.UnsignedShortType;

        this.otherScene = new THREE.Scene();
        this.otherCamera = camera.clone();

        this.otherScene.background = new THREE.Color(0xF06565);

        const boxMaterial = new THREE.MeshBasicMaterial({color: 0x7074FF});
        const boxGeometry = new THREE.BoxGeometry(5, 5, 5);
        const box1 = new THREE.Mesh(boxGeometry, boxMaterial);
        const box2 = new THREE.Mesh(boxGeometry, boxMaterial);
        box1.position.x = 7; box2.position.x = -7;
        box1.position.y = box2.position.y = 1;
        box1.position.z = box2.position.z = -10;
        this.otherScene.add(box1);
        this.otherScene.add(box2);

        this.plane = document.createElement('a-plane');
        this.plane.setAttribute('id', 'my-plane');
        this.plane.setAttribute('material', 'src', this.otherRenderTarget.texture);
        this.plane.setAttribute('material', 'shader', 'flat');
        sceneEl.appendChild(this.plane);
        // camera.el.appendChild(this.plane);

        this.dummy = document.getElementById('dummy').object3D;

        this.poses = [];
        this.dummyPoses = [];

        this.onResize();
        window.addEventListener('resize', this.onResize.bind(this));
    },

    onResize() {
        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        var rendererSize = new THREE.Vector2();
        renderer.getSize(rendererSize);
        const pixelRatio = renderer.getPixelRatio();
        this.otherRenderTarget.setSize(pixelRatio * rendererSize.width, pixelRatio * rendererSize.height);
        this.plane.setAttribute('width', pixelRatio * rendererSize.width / 10);
        this.plane.setAttribute('height', pixelRatio * rendererSize.height / 10);
        this.plane.setAttribute('position', '0 1.6 -60');
    },

    tick: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        var dummyPose = new THREE.Matrix4();
        dummyPose.copy(this.dummy.matrixWorld);
        this.dummyPoses.push(dummyPose);

        var camPose = new THREE.Matrix4();
        camPose.copy(camera.matrixWorld);
        this.poses.push(camPose);

        if (this.poses.length > data.delay / FPS_PERIOD_60Hz) {
            const pose = this.poses.shift();
            const dummyPose = this.dummyPoses.shift();

            // update other camera
            this.otherCamera.rotation.setFromRotationMatrix(pose);
            this.otherCamera.position.setFromMatrixPosition(pose);

            this.plane.object3D.rotation.setFromRotationMatrix(dummyPose);
            this.plane.object3D.position.setFromMatrixPosition(dummyPose);
        }

        const currentRenderTarget = renderer.getRenderTarget();
        renderer.setRenderTarget(this.otherRenderTarget);
        renderer.render(this.otherScene, this.otherCamera);
        renderer.setRenderTarget(currentRenderTarget);
    }
});
