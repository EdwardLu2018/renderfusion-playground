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

uniform ivec2 windowSize;
uniform ivec2 streamSize;

uniform vec3 remoteViewPortTopLeft;
uniform vec3 remoteViewPortTopRight;
uniform vec3 remoteViewPortBotLeft;
uniform vec3 remoteViewPortBotRight;

vec2 get2DPoint(vec3 point3D) {
    point3D /= point3D.z;
    vec2 point2D = vec2((point3D.x + 1.0) / 2.0, (point3D.y + 1.0) / 2.0);
    return point2D;
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

vec2 lerp(vec2 a, vec2 b, float t1) {
	return (a + t1 * (b - a));
}

float readDepth(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    return depth;
}

void main() {
    ivec2 frameSize = ivec2(streamSize.x / 2, streamSize.y);
    vec2 frameSizeF = vec2(frameSize);
    vec2 windowSizeF = vec2(windowSize);

    vec2 coordDestNormalized = vUv;
    vec2 coordStreamNormalized = vUv;

    vec2 coordDiffuseColor = coordDestNormalized;
    vec2 coordDiffuseDepth = coordDestNormalized;

    vec4 diffuseColor  = texture2D( tDiffuse, coordDiffuseColor );
    float diffuseDepth = readDepth( tDepth, coordDiffuseDepth );

    vec2 topLeftUV  = get2DPoint(remoteViewPortTopLeft);
    vec2 topRightUV = get2DPoint(remoteViewPortTopRight);
    vec2 botLeftUV  = get2DPoint(remoteViewPortBotLeft);
    vec2 botRightUV = get2DPoint(remoteViewPortBotRight);

    // vec2 coordStreamColor = coordStreamNormalized;
    // vec2 coordStreamDepth = coordStreamNormalized;

    // vec4 streamColor  = texture2D( tStream, coordStreamColor );
    // float streamDepth = readDepth( tDepthStream, coordStreamDepth );

    vec4 color;
    // color = streamColor;
    // color = diffuseDepth * streamColor + streamDepth * diffuseColor;

    if (isInQuad(topLeftUV, topRightUV, botLeftUV, botRightUV, vUv)) {
        vec2 coordStreamColor = lerp(lerp(topLeftUV, topRightUV, vUv.x), lerp(botLeftUV, botRightUV, vUv.x), 1.0f - vUv.y);
        vec2 coordStreamDepth = coordStreamColor;

        vec4 streamColor = texture2D( tStream, coordStreamColor );
        float streamDepth = readDepth( tDepthStream, coordStreamDepth );

        if (streamDepth <= diffuseDepth)
            color = vec4(streamColor.rgb, 1.0);
        else
            color = diffuseColor;
    }

    // color = vec4(streamColor.rgb, 1.0);
    // color = vec4(diffuseColor.rgb, 1.0);
    gl_FragColor = color;

    // gl_FragColor.rgb = vec3(streamDepth);
    // gl_FragColor.a = 1.0;
}
