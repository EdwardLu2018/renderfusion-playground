varying vec2 vUv;

uniform mat4 cameraLProjectionMatrix, cameraLMatrixWorld;
uniform mat4 cameraRProjectionMatrix, cameraRMatrixWorld;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    // gl_Position = vec4( position, 1.0 );
}
