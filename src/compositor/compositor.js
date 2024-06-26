import {CompositorPass} from './compositor-pass';

AFRAME.registerSystem('compositor', {
    schema: {
        doAsyncTimeWarp: {type: 'bool', default: true},
        stretchBorders: {type: 'bool', default: true},
        lowPolyInFill: {type: 'bool', default: false},
        reprojectMovement: {type: 'bool', default: false},
        preferLocal: {type: 'bool', default: false},
        fps: {type: 'number', default: 90},
    },

    init: function() {
        const sceneEl = this.sceneEl;

        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        const renderer = sceneEl.renderer;

        this.cameras = [];

        this.originalRenderFunc = null;

        this.baseResolutionWidth = 1920;
        this.baseResolutionHeight = 1080;

        this.remoteRenderTarget = new THREE.WebGLRenderTarget(this.baseResolutionWidth, this.baseResolutionHeight);
        this.remoteRenderTarget.texture.name = 'RemoteScene.rt';
        this.remoteRenderTarget.texture.minFilter = THREE.NearestFilter;
        this.remoteRenderTarget.texture.magFilter = THREE.NearestFilter;
        this.remoteRenderTarget.stencilBuffer = false;
        this.remoteRenderTarget.depthTexture = new THREE.DepthTexture();
        this.remoteRenderTarget.depthTexture.format = THREE.DepthFormat;
        this.remoteRenderTarget.depthTexture.type = THREE.UnsignedShortType;

        this.backgroundRenderTarget = new THREE.WebGLRenderTarget(1, 1);
        this.backgroundRenderTarget.texture.name = 'BackgroundScene.rt';
        this.backgroundRenderTarget.texture.minFilter = THREE.NearestFilter;
        this.backgroundRenderTarget.texture.magFilter = THREE.NearestFilter;

        this.renderTarget = new THREE.WebGLRenderTarget(1, 1);
        this.renderTarget.texture.name = 'EffectComposer.rt1';
        this.renderTarget.texture.minFilter = THREE.NearestFilter;
        this.renderTarget.texture.magFilter = THREE.NearestFilter;
        this.renderTarget.stencilBuffer = false;
        this.renderTarget.depthTexture = new THREE.DepthTexture();
        this.renderTarget.depthTexture.format = THREE.DepthFormat;
        this.renderTarget.depthTexture.type = THREE.UnsignedShortType;

        this.remoteLocal = sceneEl.systems['remote-local'];
        this.remoteScene = this.remoteLocal.remoteScene;
        this.remoteCamera = this.remoteLocal.remoteCamera;
        this.backgroundScene = this.remoteLocal.backgroundScene;
        this.pass = new CompositorPass(
                        scene, camera,
                        this.remoteScene, this.remoteCamera,
                        this.backgroundScene,
                        this.remoteRenderTarget,
                        this.backgroundRenderTarget,
                    );

        this.onResize = this.onResize.bind(this);

        this.onResize();
        window.addEventListener('resize', this.onResize);
        renderer.xr.addEventListener('sessionstart', this.onResize);
        renderer.xr.addEventListener('sessionend', this.onResize);

        this.binded = false;
        this.bind();
    },

    onResize: function() {
        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        var rendererSize = new THREE.Vector2();
        renderer.getSize(rendererSize);
        const pixelRatio = renderer.getPixelRatio();
        this.renderTarget.setSize(pixelRatio * rendererSize.width, pixelRatio * rendererSize.height);
        this.backgroundRenderTarget.setSize(pixelRatio * rendererSize.width, pixelRatio * rendererSize.height);
        this.pass.setSize(pixelRatio * rendererSize.width, pixelRatio * rendererSize.height);
    },

    bind: function() {
        if (this.binded === true) return;

        const data = this.data;

        const renderer = this.sceneEl.renderer;
        const render = renderer.render;

        const system = this;
        let isDigest = false;

        const camera = this.sceneEl.camera;
        this.remoteLocal.bind();

        this.originalRenderFunc = render;

        renderer.xr.cameraAutoUpdate = false;
        this.binded = true;

        this.sceneEl.object3D.onBeforeRender = function(renderer, scene, camera) {
            if (camera instanceof THREE.ArrayCamera) {
                system.cameras = camera.cameras;
            } else {
                system.cameras.push(camera);
            }
        }

        const isWebXRViewer = navigator.userAgent.includes('WebXRViewer');

        renderer.render = function() {
            if (isDigest) {
                // render "normally"
                render.apply(this, arguments);
            } else {
                isDigest = true;

                const cameraVR = this.xr.getCamera();

                // save render state
                const currentRenderTarget = this.getRenderTarget();
                if (currentRenderTarget != null) {
                    // resize if an existing rendertarget exists (usually in webxr mode)
                    system.renderTarget.setSize(currentRenderTarget.width, currentRenderTarget.height);
                    system.pass.setSize(currentRenderTarget.width, currentRenderTarget.height);
                    system.remoteRenderTarget.setSize(currentRenderTarget.width, currentRenderTarget.height);
                    system.backgroundRenderTarget.setSize(currentRenderTarget.width, currentRenderTarget.height);
                }

                // store "normal" rendering output to this.renderTarget
                this.setRenderTarget(system.renderTarget);
                // update local vr camera if in vr
                if (this.xr.enabled === true && this.xr.isPresenting === true) {
                    this.xr.updateCamera( cameraVR, system.sceneEl.camera );
                }
                render.apply(this, arguments);

                this.setRenderTarget(currentRenderTarget);

                let hasDualCameras;
                if (system.cameras.length > 1) {
                    // we have two cameras here (vr mode or headset ar mode)
                    hasDualCameras = !isWebXRViewer; // webarviewer seens to have 2 cameras, but uses one...
                } else if (system.cameras.length === 1) {
                    // we just have a single xr camera here
                    hasDualCameras = false;
                } else {
                    // not in xr mode, just one camera
                    hasDualCameras = false;
                }

                system.pass.setHasDualCameras(hasDualCameras);
                system.pass.setStretchBorders(data.stretchBorders);
                system.pass.setLowPolyInFill(data.lowPolyInFill);
                system.pass.setReprojectMovement(data.reprojectMovement);
                system.pass.setDoAsyncTimeWarp(data.doAsyncTimeWarp);
                system.pass.setPreferLocal(data.preferLocal);
                if (this.xr.enabled === true && this.xr.isPresenting === true) {
                    const cameraL = cameraVR.cameras[0];
                    const cameraR = cameraVR.cameras[1];
                    system.pass.setCameraVals(cameraL, cameraR);
                } else {
                    system.pass.setCameraVals(camera);
                    system.remoteLocal.updateRemoteCamera();
                    system.pass.setCameraValsRemote(system.remoteCamera);
                }

                // update remote vr camera if in vr
                if (this.xr.enabled === true && this.xr.isPresenting === true) {
                    this.xr.updateCamera( cameraVR, system.remoteCamera );

                    const remoteL = system.remoteCamera.cameras[0];
                    const remoteR = system.remoteCamera.cameras[1];
                    system.pass.setCameraValsRemote(remoteL, remoteR);
                }
                // render with custom shader (local-remote compositing):
                // this will internally call renderer.render(), which will execute the code within
                // the isDigest conditional above (render normally). this will copy the result of
                // the rendering to the readbuffer in the compositor (aka this.renderTarget), which we
                // will use for the "local" frame.
                // the composer will take the "local" frame and merge it with the "remote" frame from
                // the video by calling the compositor pass and executing the shaders.
                system.pass.render(this, currentRenderTarget, system.renderTarget);

                // restore render state
                this.setRenderTarget(currentRenderTarget);

                // call this part of the conditional again on the next call to render()
                isDigest = false;
            }

            system.cameras = [];
        };
    },

    decreaseResolution: function(scaleDownBy) {
        this.remoteRenderTarget.setSize(this.baseResolutionWidth / scaleDownBy, this.baseResolutionHeight / scaleDownBy);
    },

    unbind: function() {
        if (!this.binded === true) return;

        const renderer = this.sceneEl.renderer;
        renderer.render = this.originalRenderFunc;
        renderer.xr.cameraAutoUpdate = true;
        this.sceneEl.object3D.onBeforeRender = () => {};
        this.remoteLocal.unbind();
        this.binded = false;
    },
});
