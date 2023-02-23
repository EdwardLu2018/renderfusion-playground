import { GUI } from 'dat.gui';

const FPS_PERIOD_60Hz = (1 / 60 * 1000);

AFRAME.registerSystem('other-scene', {
    schema: {
        fps: {type: 'number', default: 60},
        latency: {type: 'number', default: 150}, // ms
        doAsyncTimeWarp: {type: 'bool', default: true},
        applyCompositor: {type: 'bool', default: true}
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
        box1.position.x = 10; box2.position.x = -10;
        box1.position.y = box2.position.y = 1.6;
        box1.position.z = box2.position.z = -10;
        this.otherScene.add(box1);
        this.otherScene.add(box2);

        // const texture = new THREE.TextureLoader().load('./color.png');
        // const geometry = new THREE.PlaneGeometry(192, 108, 1, 1);
        // const material = new THREE.MeshBasicMaterial( { map: texture } );
        // const mesh = new THREE.Mesh(geometry, material);
        // mesh.position.x = -6;
        // mesh.position.y = 1.6;
        // mesh.position.z = -100;
        // mesh.rotation.x = -Math.PI / 8;
        // mesh.rotation.z = -Math.PI / 8;
        // this.otherScene.add(mesh);

        if (!data.applyCompositor) {
            this.plane = document.createElement('a-plane');
            this.plane.setAttribute('id', 'my-plane');
            this.plane.setAttribute('material', 'src', this.otherRenderTarget.texture);
            this.plane.setAttribute('material', 'shader', 'flat');
            sceneEl.appendChild(this.plane);
            // camera.add(this.plane.object3D);
        }

        this.dummy = document.getElementById('dummy').object3D;

        this.poses = [];
        this.dummyPoses = [];
        this.box1 = box1;

        if (data.applyCompositor) {
            sceneEl.systems['compositor'].handleRemoteTexture(this.otherRenderTarget, this.otherScene, this.otherCamera);
        }

        this.onResize();
        window.addEventListener('resize', this.onResize.bind(this));
    },

    onResize() {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        const camera = sceneEl.camera;

        var rendererSize = new THREE.Vector2();
        renderer.getSize(rendererSize);
        const pixelRatio = renderer.getPixelRatio();
        this.otherRenderTarget.setSize(pixelRatio * rendererSize.width, pixelRatio * rendererSize.height);
        if (!data.applyCompositor) {
            this.plane.setAttribute('width', pixelRatio * rendererSize.width / 10);
            this.plane.setAttribute('height', pixelRatio * rendererSize.height / 10);
            this.plane.setAttribute('position', '0 1.6 -68');
        }

        this.otherCamera.copy(camera);
    },

    tick: function () {
        const el = this.el;
        const data = this.data;

        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        if (data.doAsyncTimeWarp) {
            var dummyPose = new THREE.Matrix4();
            dummyPose.copy(this.dummy.matrixWorld);
            this.dummyPoses.push(dummyPose);
        }

        var camPose = new THREE.Matrix4();
        camPose.copy(camera.matrixWorld);
        this.poses.push(camPose);

        if (this.poses.length > data.latency / FPS_PERIOD_60Hz) {
            const pose = this.poses.shift();
            // update other camera
            this.otherCamera.rotation.setFromRotationMatrix(pose);
            this.otherCamera.position.setFromMatrixPosition(pose);

            // var vectorTopLeft = new THREE.Vector3( -1, 1, 1 ).unproject( this.otherCamera ).sub(this.otherCamera.position);
            // var vectorTopRight = new THREE.Vector3( 1, 1, 1 ).unproject( this.otherCamera ).sub(this.otherCamera.position);
            // var vectorBotLeft = new THREE.Vector3( -1, -1, 1 ).unproject( this.otherCamera ).sub(this.otherCamera.position);
            // var vectorBotRight = new THREE.Vector3( 1, -1, 1 ).unproject( this.otherCamera ).sub(this.otherCamera.position);

            // var material = new THREE.LineBasicMaterial({ color: 0xAAFFAA });
            // var points = [];
            // points.push(this.otherCamera.position);
            // points.push(vectorBotRight.add(this.otherCamera.position));
            // var geometry = new THREE.BufferGeometry().setFromPoints( points );
            // var line = new THREE.Line( geometry, material );
            // this.otherScene.add( line );

            if (data.doAsyncTimeWarp) {
                const dummyPose = this.dummyPoses.shift();
                if (!data.applyCompositor) {
                    this.plane.object3D.rotation.setFromRotationMatrix(dummyPose);
                    this.plane.object3D.position.setFromMatrixPosition(dummyPose);
                }
            }

            this.box1.rotation.x += 0.01;
            this.box1.rotation.y += 0.01;
            this.box1.rotation.z += 0.01;
        }

        if (!data.applyCompositor) {
            const currentRenderTarget = renderer.getRenderTarget();
            renderer.setRenderTarget(this.otherRenderTarget);
            renderer.render(this.otherScene, this.otherCamera);
            renderer.setRenderTarget(currentRenderTarget);
        }
    }
});
