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

uniform mat4 cameraProjectionMatrix;
uniform mat4 cameraMatrixWorld;
uniform mat4 remoteCameraProjectionMatrix;
uniform mat4 remoteCameraMatrixWorld;

uniform vec3 cameraPos;
uniform vec3 remoteCameraPos;

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

vec2 intersectQuad(vec3 p0, vec3 n, vec3 l0, vec3 l) {
    n = normalize(n);
    l = normalize(l);
    float t = 0.0;
    float denom = dot(n, l);
    if (denom > 1e-6) {
        vec3 p0l0 = p0 - l0;
        t = dot(p0l0, n) / denom;
        return vec2(t >= 0.0, t);
    }
    return vec2(0.0, t);
}

float readDepth(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    return depth;
}

vec3 lerp(vec3 a, vec3 b, float t) {
	return (a + t * (b - a));
}

vec3 unprojectCamera(vec2 uv) {
    vec4 uv4 = cameraMatrixWorld * inverse(cameraProjectionMatrix) * vec4(image2NDC(uv), 1.0, 1.0);
    vec3 uv3 = uv4.xyz / uv4.w;
    return uv3;
}

vec2 projectCamera(vec3 pt) {
    vec4 uv4 = cameraProjectionMatrix * inverse(cameraMatrixWorld) * vec4(pt, 1.0);
    vec2 uv2 = unhomogenize(uv4.xyz / uv4.w);
    return NDC2image(uv2);
}

vec3 unprojectRemoteCamera(vec2 uv) {
    vec4 uv4 = remoteCameraMatrixWorld * inverse(remoteCameraProjectionMatrix) * vec4(image2NDC(uv), 1.0, 1.0);
    vec3 uv3 = uv4.xyz / uv4.w;
    return uv3;
}

vec2 projectRemoteCamera(vec3 pt) {
    vec4 uv4 = remoteCameraProjectionMatrix * inverse(remoteCameraMatrixWorld) * vec4(pt, 1.0);
    vec2 uv2 = unhomogenize(uv4.xyz / uv4.w);
    return NDC2image(uv2);
}

// linePnt - point the line passes through
// lineDir - unit vector in direction of line, either direction works
// pnt - the point to find nearest on line for
vec3 nearestPointOnLine(vec3 linePnt, vec3 lineDir, vec3 pnt) {
    lineDir = normalize(lineDir);
    vec3 v = pnt - linePnt;
    float d = dot(v, lineDir);
    return linePnt + lineDir * d;
}

void main() {
    ivec2 frameSize = ivec2(streamSize.x / 2, streamSize.y);
    vec2 frameSizeF = vec2(frameSize);
    vec2 windowSizeF = vec2(windowSize);

    // calculate new dimensions, maintaining aspect ratio
    float aspect = frameSizeF.x / frameSizeF.y;
    int newHeight = windowSize.y;
    int newWidth = int(float(newHeight) * aspect);

    // calculate left and right padding offset
    int totalPad = abs(windowSize.x - newWidth);
    float padding = float(totalPad / 2);
    float paddingLeft = padding / windowSizeF.x;
    float paddingRight = 1.0 - paddingLeft;

    bool targetWidthGreater = windowSize.x > newWidth;

    vec2 coordDiffuseNormalized = vUv;
    vec2 coordStreamNormalized = vUv;
    // if (targetWidthGreater) {
    //     coordStreamNormalized = vec2(
    //         ( (vUv.x * windowSizeF.x - padding) / float(windowSize.x - totalPad) ) / 2.0,
    //         vUv.y
    //     );
    // }
    // else {
    //     coordStreamNormalized = vec2(
    //         ( (vUv.x * windowSizeF.x + padding) / float(newWidth) ) / 2.0,
    //         vUv.y
    //     );
    // }

    vec2 coordDiffuseColor = coordDiffuseNormalized;
    vec2 coordDiffuseDepth = coordDiffuseNormalized;

    vec4 diffuseColor  = texture2D( tDiffuse, coordDiffuseColor );
    float diffuseDepth = readDepth( tDepth, coordDiffuseDepth );

    if (doAsyncTimeWarp) {
        if (!hasDualCameras) {
            vec3 cameraTopLeft  = unprojectCamera(vec2(0.0, 1.0));
            vec3 cameraTopRight = unprojectCamera(vec2(1.0, 1.0));
            vec3 cameraBotLeft  = unprojectCamera(vec2(0.0, 0.0));
            vec3 cameraBotRight = unprojectCamera(vec2(1.0, 0.0));

            vec3 remoteTopLeft  = unprojectRemoteCamera(vec2(0.0, 1.0));
            vec3 remoteTopRight = unprojectRemoteCamera(vec2(1.0,1.0));
            vec3 remoteBotLeft  = unprojectRemoteCamera(vec2(0.0, 0.0));
            vec3 remoteBotRight = unprojectRemoteCamera(vec2(1.0, 0.0));

            vec3 cameraVector = lerp(lerp(cameraTopLeft, cameraTopRight, vUv.x), lerp(cameraBotLeft, cameraBotRight, vUv.x), 1.0 - vUv.y);

            vec3 remotePlaneNormal = cross(remoteTopRight - remoteTopLeft, remoteBotLeft - remoteTopLeft);
            vec2 res = intersectQuad(remoteTopLeft, remotePlaneNormal, cameraPos, cameraVector);
            float t = res.y;
            vec3 hitPt = cameraPos + cameraVector * t;
            vec2 uv3 = projectRemoteCamera(hitPt);
            coordStreamNormalized = uv3;
            coordStreamNormalized = uv3;
        }
    }

    vec4 streamColor = texture2D( tStream, coordStreamNormalized );
    float streamDepth = readDepth( tDepthStream, coordStreamNormalized );

    vec4 color;
    // if (!targetWidthGreater ||
    //     (targetWidthGreater && paddingLeft <= vUv.x && vUv.x <= paddingRight)) {
        if (streamDepth <= diffuseDepth)
            color = vec4(streamColor.rgb, 1.0);
        else
            color = diffuseColor;
    // }
    // else {
    //     color = diffuseColor;
    // }

    // color = vec4(streamColor.rgb, 1.0);
    // color = vec4(diffuseColor.rgb, 1.0);
    gl_FragColor = color;

    // gl_FragColor.rgb = vec3(streamDepth);
    // gl_FragColor.a = 1.0;
}
