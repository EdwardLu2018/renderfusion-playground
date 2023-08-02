import {FullScreenQuad, Pass} from './pass';
import {CompositorShader} from './compositor-shader';

export class CompositorPass extends Pass {
    constructor(scene, camera, remoteScene, remoteCamera, backgroundScene, remoteRenderTarget, backgroundRenderTarget) {
        super();

        this.scene = scene;
        this.camera = camera;

        this.remoteScene = remoteScene;
        this.remoteCamera = remoteCamera;

        this.backgroundScene = backgroundScene;

        this.remoteRenderTarget = remoteRenderTarget;
        this.backgroundRenderTarget = backgroundRenderTarget;

        this.uniforms = THREE.UniformsUtils.clone(CompositorShader.uniforms);
        this.material = new THREE.ShaderMaterial({
            defines: Object.assign({}, CompositorShader.defines),
            uniforms: this.uniforms,
            vertexShader: CompositorShader.vertexShader,
            fragmentShader: CompositorShader.fragmentShader,
        });

        this.material.uniforms.tRemoteColor.value = this.remoteRenderTarget.texture;
        this.material.uniforms.tRemoteDepth.value = this.remoteRenderTarget.depthTexture;
        this.material.uniforms.remoteSize.value = [this.remoteRenderTarget.width, this.remoteRenderTarget.height];

        this.material.uniforms.tBackgroundColor.value = this.backgroundRenderTarget.texture;

        this.frozen = false;

        this.needsSwap = false;

        this.fsQuad = new FullScreenQuad(this.material);

        window.addEventListener('enter-vr', this.onEnterVR.bind(this));
        window.addEventListener('exit-vr', this.onExitVR.bind(this));
    }

    setSize(width, height) {
        this.material.uniforms.localSize.value = [width, height];
    }

    setHasDualCameras(hasDualCameras) {
        this.material.uniforms.hasDualCameras.value = hasDualCameras;
    }

    setStretchBorders(stretchBorders) {
        this.material.uniforms.stretchBorders.value = stretchBorders;
    }

    setLowPolyInFill(lowPolyInFill) {
        this.material.uniforms.lowPolyInFill.value = lowPolyInFill;
    }

    setDoAsyncTimeWarp(doAsyncTimeWarp) {
        this.material.uniforms.doAsyncTimeWarp.value = doAsyncTimeWarp;
    }

    setPreferLocal(preferLocal) {
        this.material.uniforms.preferLocal.value = preferLocal;
    }

    setReprojectMovement(reprojectMovement) {
        this.material.uniforms.reprojectMovement.value = reprojectMovement;
    }

    setFrozen(frozen) {
        this.frozen = frozen;
    }

    setCameraMats(cameraL, cameraR) {
        if (cameraL) {
            this.material.uniforms.cameraLProjectionMatrix.value.copy(cameraL.projectionMatrix);
            this.material.uniforms.cameraLMatrixWorld.value.copy(cameraL.matrixWorld);

            this.material.uniforms.cameraNear.value = cameraL.near;
            this.material.uniforms.cameraFar.value = cameraL.far;
        }

        if (cameraR) {
            this.material.uniforms.cameraRProjectionMatrix.value.copy(cameraR.projectionMatrix);
            this.material.uniforms.cameraRMatrixWorld.value.copy(cameraR.matrixWorld);
        }
    }

    setCameraMatsRemote(remoteL, remoteR) {
        if (remoteL) {
            this.material.uniforms.remoteLProjectionMatrix.value.copy(remoteL.projectionMatrix);
            this.material.uniforms.remoteLMatrixWorld.value.copy(remoteL.matrixWorld);
            remoteL.getWorldDirection(this.material.uniforms.remoteLForward.value);
        }

        if (remoteR) {
            this.material.uniforms.remoteRProjectionMatrix.value.copy(remoteR.projectionMatrix);
            this.material.uniforms.remoteRMatrixWorld.value.copy(remoteR.matrixWorld);
            remoteR.getWorldDirection(this.material.uniforms.remoteRForward.value);
        }
    }

    getHasDualCameras() {
        return this.material.uniforms.hasDualCameras.value;
    }

    onEnterVR() {
        const sceneEl = document.querySelector('a-scene');
        if (sceneEl.is('ar-mode')) {
            this.material.uniforms.arMode.value = true;
        } else {
            this.material.uniforms.vrMode.value = true;
        }
    }

    onExitVR() {
        this.material.uniforms.arMode.value = false;
        this.material.uniforms.vrMode.value = false;
    }

    render(renderer, writeBuffer, readBuffer /* , deltaTime, maskActive */) {
        this.material.uniforms.tLocalColor.value = readBuffer.texture;
        this.material.uniforms.tLocalDepth.value = readBuffer.depthTexture;

        renderer.setRenderTarget(this.remoteRenderTarget);
        renderer.render(this.remoteScene, this.remoteCamera);

        if (this.material.uniforms.lowPolyInFill.value === true) {
            renderer.setRenderTarget(this.backgroundRenderTarget);
            renderer.render(this.backgroundScene, this.camera);
        }

        const currentXREnabled = renderer.xr.enabled;
        renderer.xr.enabled = false;
        renderer.setRenderTarget(writeBuffer);
        this.fsQuad.render(renderer);
        renderer.xr.enabled = currentXREnabled;
    }
}
