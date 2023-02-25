import {FullScreenQuad, Pass} from './pass';
import {CompositorShader} from './compositor-shader';

export class CompositorPass extends Pass {
    constructor(scene, camera, remoteRenderTarget, remoteScene, remoteCamera) {
        super();

        this.remoteRenderTarget = remoteRenderTarget;
        this.remoteScene = remoteScene;
        this.remoteCamera = remoteCamera;

        this.uniforms = THREE.UniformsUtils.clone(CompositorShader.uniforms);
        this.material = new THREE.ShaderMaterial({
            defines: Object.assign({}, CompositorShader.defines),
            uniforms: this.uniforms,
            vertexShader: CompositorShader.vertexShader,
            fragmentShader: CompositorShader.fragmentShader,
        });

        this.material.uniforms.tStream.value = this.remoteRenderTarget.texture;
        this.material.uniforms.tDepthStream.value = this.remoteRenderTarget.depthTexture;
        this.material.uniforms.streamSize.value = [this.remoteRenderTarget.width, this.remoteRenderTarget.height];
        this.material.uniforms.cameraNear.value = camera.near;
        this.material.uniforms.cameraFar.value = camera.far;

        this.needsSwap = false;

        this.fsQuad = new FullScreenQuad(this.material);

        window.addEventListener('enter-vr', this.onEnterVR.bind(this));
        window.addEventListener('exit-vr', this.onExitVR.bind(this));
    }

    setSize(width, height) {
        this.material.uniforms.windowSize.value = [width, height];
    }

    setHasDualCameras(hasDualCameras) {
        this.material.uniforms.hasDualCameras.value = hasDualCameras;
    }

    setDoAsyncTimeWarp(doAsyncTimeWarp) {
        this.material.uniforms.doAsyncTimeWarp.value = doAsyncTimeWarp;
    }

    setCameraMats(cameraProjectionMatrix, cameraMatrixWorld, cameraPos,
                  remoteCameraProjectionMatrix, remoteCameraMatrixWorld, remoteCameraPos) {
        this.material.uniforms.cameraProjectionMatrix.value  = cameraProjectionMatrix;
        this.material.uniforms.cameraMatrixWorld.value = cameraMatrixWorld;
        this.material.uniforms.cameraPos.value = cameraPos;
        this.material.uniforms.remoteCameraProjectionMatrix.value  = remoteCameraProjectionMatrix;
        this.material.uniforms.remoteCameraMatrixWorld.value = remoteCameraMatrixWorld;
        this.material.uniforms.remoteCameraPos.value = remoteCameraPos;
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
        this.material.uniforms.tDiffuse.value = readBuffer.texture;
        this.material.uniforms.tDepth.value = readBuffer.depthTexture;

        renderer.setRenderTarget(this.remoteRenderTarget);
        renderer.render(this.remoteScene, this.remoteCamera);

        renderer.setRenderTarget( writeBuffer );
        this.fsQuad.render( renderer );
    }
}
