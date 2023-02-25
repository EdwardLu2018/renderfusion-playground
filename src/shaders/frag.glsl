#include <packing>

varying vec2 vUv;

uniform sampler2D tDiffuse;
uniform sampler2D tStream;
uniform sampler2D tDepth;
uniform sampler2D tDepthStream;

uniform float cameraNear;
uniform float cameraFar;

uniform bool hasDualCameras;
uniform bool arMode;
uniform bool vrMode;
uniform bool doAsyncTimeWarp;

uniform ivec2 windowSize;
uniform ivec2 streamSize;

uniform vec3 remoteViewPortTopLeft;
uniform vec3 remoteViewPortTopRight;
uniform vec3 remoteViewPortBotLeft;
uniform vec3 remoteViewPortBotRight;

uniform mat4 cameraProjectionMatrix;
uniform mat4 cameraMatrixWorld;
uniform mat4 remoteCameraProjectionMatrix;
uniform mat4 remoteCameraMatrixWorld;

vec3 homogenize(vec2 coord) {
    return vec3(coord, 1.0);
}

vec2 unhomogenize(vec3 coord) {
    return coord.xy / coord.z;
}

vec2 image2NDC(vec2 imageCoords) {
    return 2.0 * imageCoords - 1.0;
}

vec2 NDC2image(vec2 ndcCoords) {
    return (ndcCoords + 1.0) / 2.0;
}

bool isInTriangle(vec2 t0, vec2 t1, vec2 t2, vec2 p) {
    vec2 v0 = t1 - t0;
    vec2 v1 = t2 - t0;
    vec2 v2 = p - t0;
    float d00 = dot(v0, v0);
    float d01 = dot(v0, v1);
    float d11 = dot(v1, v1);
    float d20 = dot(v2, v0);
    float d21 = dot(v2, v1);
    float invDenom = 1.0 / (d00 * d11 - d01 * d01);
    float u = (d11 * d20 - d01 * d21) * invDenom;
    float v = (d00 * d21 - d01 * d20) * invDenom;

    return (u >= 0.0 && u <= 1.0 && v >= 0.0 && v <= 1.0 && u + v <= 1.0);
}

bool isInQuad(vec2 q0, vec2 q1, vec2 q2, vec2 q3, vec2 p) {
    return isInTriangle(q0, q1, q2, p) || isInTriangle(q3, q1, q2, p);
}

float readDepth(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    return depth;
}

vec3 lerp(vec3 a, vec3 b, float t) {
	return (a + t * (b - a));
}

void main() {
    ivec2 frameSize = ivec2(streamSize.x / 2, streamSize.y);
    vec2 frameSizeF = vec2(frameSize);
    vec2 windowSizeF = vec2(windowSize);

    vec2 coordDiffuseColor = vUv;
    vec2 coordDiffuseDepth = vUv;

    vec4 diffuseColor  = texture2D( tDiffuse, coordDiffuseColor );
    float diffuseDepth = readDepth( tDepth, coordDiffuseDepth );

    vec4 streamColor;
    float streamDepth;

    if (doAsyncTimeWarp) {
        vec2 topLeft  = remoteViewPortTopLeft;
        vec2 topRight = remoteViewPortTopRight;
        vec2 botLeft  = remoteViewPortBotLeft;
        vec2 botRight = remoteViewPortBotRight;

        vec3 cameraVector = lerp(lerp(topLeft, topRight, vUv.x), lerp(botLeft, botRight, vUv.x), 1.0 - vUv.y);

        // if (distance(topLeftUV, vUv)  < 0.02) streamColor = vec4(1.0, 0.0, 0.0, 1.0);
        // if (distance(topRightUV, vUv) < 0.02) streamColor = vec4(0.0, 1.0, 0.0, 1.0);
        // if (distance(botLeftUV, vUv)  < 0.02) streamColor = vec4(0.0, 0.0, 1.0, 1.0);
        // if (distance(botRightUV, vUv) < 0.02) streamColor = vec4(1.0, 1.0, 0.0, 1.0);

        if (isInQuad(topLeftUV, topRightUV, botLeftUV, botRightUV, cameraVector)) {

        }

        // if (isInQuad(topLeftUV, topRightUV, botLeftUV, botRightUV, vUv)) {
        //     // uv -> xyz_cam
        //     vec4 vUv3DHomo = cameraMatrixWorld * inverse(cameraProjectionMatrix) * vec4(image2NDC(vUv), 1.0, 1.0);
        //     // xyz_cam -> uv_remote_cam
        //     vec4 vUvRemoteCamera2DHomo = remoteCameraProjectionMatrix * inverse(remoteCameraMatrixWorld) * vUv3DHomo;
        //     vec2 vUvRemoteCamera2D = NDC2image(unhomogenize(vUvRemoteCamera2DHomo.xyz / vUvRemoteCamera2DHomo.w));

        //     vec2 coordStreamColor = vUvRemoteCamera2D;
        //     vec2 coordStreamDepth = coordStreamColor;

        //     streamColor = texture2D( tStream, coordStreamColor );
        //     streamDepth = readDepth( tDepthStream, coordStreamDepth );
        // }
        // else {
        //     streamColor = vec4(0.0, 0.0, 0.0, 1.0);
        //     streamDepth = 0.0;
        //     // TODO: grab nearest color
        //     // vec4 streamColor = texture2D( tStream, vUv );
        //     // color = streamColor;
        // }
    }
    else {
        streamColor = texture2D( tStream, vUv );
        streamDepth = readDepth( tDepthStream, vUv );
    }

    vec4 color;
    if (streamDepth <= diffuseDepth)
        color = vec4(streamColor.rgb, 1.0);
    else
        color = diffuseColor;

    // color = vec4(streamColor.rgb, 1.0);
    // color = vec4(diffuseColor.rgb, 1.0);
    gl_FragColor = color;

    // gl_FragColor.rgb = vec3(streamDepth);
    // gl_FragColor.a = 1.0;
}
