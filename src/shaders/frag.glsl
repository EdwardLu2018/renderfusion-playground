#include <packing>

varying vec2 vUv;

uniform sampler2D tLocalColor;
uniform sampler2D tLocalDepth;
uniform sampler2D tRemoteColor;
uniform sampler2D tRemoteDepth;

uniform float cameraNear;
uniform float cameraFar;

uniform bool hasDualCameras;
uniform bool arMode;
uniform bool vrMode;

uniform bool doAsyncTimeWarp;
uniform bool stretchBorders;

uniform ivec2 windowSize;
uniform ivec2 streamSize;

uniform mat4 cameraLProjectionMatrix;
uniform mat4 cameraLMatrixWorld;

uniform mat4 remoteLProjectionMatrix;
uniform mat4 remoteLMatrixWorld;

uniform mat4 cameraRProjectionMatrix;
uniform mat4 cameraRMatrixWorld;

uniform mat4 remoteRProjectionMatrix;
uniform mat4 remoteRMatrixWorld;

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

float intersectPlane(vec3 p0, vec3 n, vec3 l0, vec3 l) {
    n = normalize(n);
    l = normalize(l);
    float t = 0.0;
    float denom = dot(n, l);
    if (denom > 1e-6) {
        vec3 p0l0 = p0 - l0;
        t = dot(p0l0, n) / denom;
        return t;
    }
    return t;
}

float readDepth(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    return depth;
}

vec3 unprojectCamera(vec2 uv, mat4 projectionMatrix, mat4 matrixWorld) {
    vec4 uv4 = matrixWorld * inverse(projectionMatrix) * vec4(image2NDC(uv), 1.0, 1.0);
    vec3 uv3 = uv4.xyz / uv4.w;
    return uv3;
}

vec2 projectCamera(vec3 pt, mat4 projectionMatrix, mat4 matrixWorld) {
    vec4 uv4 = projectionMatrix * inverse(matrixWorld) * vec4(pt, 1.0);
    vec2 uv2 = unhomogenize(uv4.xyz / uv4.w);
    return NDC2image(uv2);
}

vec3 matrixWorldToPosition(mat4 matrixWorld) {
    return vec3(matrixWorld[0][3], matrixWorld[1][3], matrixWorld[2][3]);
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

    vec2 coordLocalNormalized = vUv;
    vec2 coordRemoteNormalized = vUv;
    // if (targetWidthGreater) {
    //     coordRemoteNormalized = vec2(
    //         ( (vUv.x * windowSizeF.x - padding) / float(windowSize.x - totalPad) ) / 2.0,
    //         vUv.y
    //     );
    // }
    // else {
    //     coordRemoteNormalized = vec2(
    //         ( (vUv.x * windowSizeF.x + padding) / float(newWidth) ) / 2.0,
    //         vUv.y
    //     );
    // }

    vec2 coordLocalColor = coordLocalNormalized;
    vec2 coordLocalDepth = coordLocalNormalized;

    vec4 localColor  = texture2D( tLocalColor, coordLocalColor );
    float localDepth = readDepth( tLocalDepth, coordLocalDepth );

    vec4 remoteColor = texture2D( tRemoteColor, coordRemoteNormalized );
    float remoteDepth = readDepth( tRemoteDepth, coordRemoteNormalized );

    if (doAsyncTimeWarp) {
        vec3 cameraTopLeft, cameraTopRight, cameraBotLeft, cameraBotRight;
        vec3 remoteTopLeft, remoteTopRight, remoteBotLeft, remoteBotRight;

        if (!hasDualCameras) {
            cameraTopLeft  = unprojectCamera(vec2(0.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
            cameraTopRight = unprojectCamera(vec2(1.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
            cameraBotLeft  = unprojectCamera(vec2(0.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);
            cameraBotRight = unprojectCamera(vec2(1.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);

            remoteTopLeft  = unprojectCamera(vec2(0.0, 1.0), remoteLProjectionMatrix, remoteLMatrixWorld);
            remoteTopRight = unprojectCamera(vec2(1.0, 1.0), remoteLProjectionMatrix, remoteLMatrixWorld);
            remoteBotLeft  = unprojectCamera(vec2(0.0, 0.0), remoteLProjectionMatrix, remoteLMatrixWorld);
            remoteBotRight = unprojectCamera(vec2(1.0, 0.0), remoteLProjectionMatrix, remoteLMatrixWorld);

            vec3 cameraVector = mix( mix(cameraTopLeft, cameraTopRight, vUv.x),
                                     mix(cameraBotLeft, cameraBotRight, vUv.x),
                                     1.0 - vUv.y );
            vec3 cameraPos = matrixWorldToPosition(cameraLMatrixWorld);

            vec3 remotePlaneNormal = cross(remoteTopRight - remoteTopLeft, remoteBotLeft - remoteTopLeft);
            float t = intersectPlane(remoteTopLeft, remotePlaneNormal, cameraPos, cameraVector);
            vec3 hitPt = cameraPos + cameraVector * t;
            vec2 uv3 = projectCamera(hitPt, remoteLProjectionMatrix, remoteLMatrixWorld);

            coordRemoteNormalized = uv3;
        }
        else {
            if (vUv.x < 0.5) {
                float x = 2.0 * vUv.x;
                cameraTopLeft  = unprojectCamera(vec2(0.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
                cameraTopRight = unprojectCamera(vec2(1.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
                cameraBotLeft  = unprojectCamera(vec2(0.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);
                cameraBotRight = unprojectCamera(vec2(1.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);

                remoteTopLeft  = unprojectCamera(vec2(0.0, 1.0), remoteLProjectionMatrix, remoteLMatrixWorld);
                remoteTopRight = unprojectCamera(vec2(1.0, 1.0), remoteLProjectionMatrix, remoteLMatrixWorld);
                remoteBotLeft  = unprojectCamera(vec2(0.0, 0.0), remoteLProjectionMatrix, remoteLMatrixWorld);
                remoteBotRight = unprojectCamera(vec2(1.0, 0.0), remoteLProjectionMatrix, remoteLMatrixWorld);

                vec3 cameraLVector = mix( mix(cameraTopLeft, cameraTopRight, x),
                                         mix(cameraBotLeft, cameraBotRight, x),
                                         1.0 - vUv.y );
                vec3 cameraLPos = matrixWorldToPosition(cameraLMatrixWorld);

                vec3 remotePlaneNormal = cross(remoteTopRight - remoteTopLeft, remoteBotLeft - remoteTopLeft);
                float t = intersectPlane(remoteTopLeft, remotePlaneNormal, cameraLPos, cameraLVector);
                vec3 hitPt = cameraLPos + cameraLVector * t;
                vec2 uv3 = projectCamera(hitPt, remoteLProjectionMatrix, remoteLMatrixWorld);

                coordRemoteNormalized = uv3;
                coordRemoteNormalized.x = coordRemoteNormalized.x / 2.0;
            }
            else {
                float x = 2.0 * (vUv.x - 0.5);
                cameraTopLeft  = unprojectCamera(vec2(0.0, 1.0), cameraRProjectionMatrix, cameraRMatrixWorld);
                cameraTopRight = unprojectCamera(vec2(1.0, 1.0), cameraRProjectionMatrix, cameraRMatrixWorld);
                cameraBotLeft  = unprojectCamera(vec2(0.0, 0.0), cameraRProjectionMatrix, cameraRMatrixWorld);
                cameraBotRight = unprojectCamera(vec2(1.0, 0.0), cameraRProjectionMatrix, cameraRMatrixWorld);

                remoteTopLeft  = unprojectCamera(vec2(0.0, 1.0), remoteRProjectionMatrix, remoteRMatrixWorld);
                remoteTopRight = unprojectCamera(vec2(1.0, 1.0), remoteRProjectionMatrix, remoteRMatrixWorld);
                remoteBotLeft  = unprojectCamera(vec2(0.0, 0.0), remoteRProjectionMatrix, remoteRMatrixWorld);
                remoteBotRight = unprojectCamera(vec2(1.0, 0.0), remoteRProjectionMatrix, remoteRMatrixWorld);

                vec3 cameraRVector = mix( mix(cameraTopLeft, cameraTopRight, x),
                                          mix(cameraBotLeft, cameraBotRight, x),
                                          1.0 - vUv.y );
                vec3 cameraRPos = matrixWorldToPosition(cameraRMatrixWorld);

                vec3 remotePlaneNormal = cross(remoteTopRight - remoteTopLeft, remoteBotLeft - remoteTopLeft);
                float t = intersectPlane(remoteTopLeft, remotePlaneNormal, cameraRPos, cameraRVector);
                vec3 hitPt = cameraRPos + cameraRVector * t;
                vec2 uv3 = projectCamera(hitPt, remoteRProjectionMatrix, remoteRMatrixWorld);

                coordRemoteNormalized = uv3;
                coordRemoteNormalized.x = coordRemoteNormalized.x / 2.0 + 0.5;
            }
        }

        float xMin = ((!hasDualCameras || vUv.x < 0.5) ? 0.0 : 0.5);
        float xMax = ((!hasDualCameras || vUv.x >= 0.5) ? 1.0 : 0.5) - 0.005;
        if (!stretchBorders) {
            if (coordRemoteNormalized.x < xMin ||
                coordRemoteNormalized.x > xMax ||
                coordRemoteNormalized.y < 0.0 ||
                coordRemoteNormalized.y > 1.0) {
                remoteColor = vec4(0.0);
            }
            remoteDepth = readDepth( tRemoteDepth, coordRemoteNormalized );
        }
        else {
            coordRemoteNormalized.x = max(coordRemoteNormalized.x, xMin);
            coordRemoteNormalized.x = min(coordRemoteNormalized.x, xMax);
            coordRemoteNormalized.y = max(coordRemoteNormalized.y, 0.0);
            coordRemoteNormalized.y = min(coordRemoteNormalized.y, 1.0);
            remoteColor = texture2D( tRemoteColor, coordRemoteNormalized );
            remoteDepth = readDepth( tRemoteDepth, coordRemoteNormalized );
        }

        // vec2 a = projectCamera(remoteTopLeft, cameraLProjectionMatrix, cameraLMatrixWorld);
        // vec2 b = projectCamera(remoteTopRight, cameraLProjectionMatrix, cameraLMatrixWorld);
        // vec2 c = projectCamera(remoteBotLeft, cameraLProjectionMatrix, cameraLMatrixWorld);
        // vec2 d = projectCamera(remoteBotRight, cameraLProjectionMatrix, cameraLMatrixWorld);

        // vec2 e = projectCamera(cameraTopLeft, cameraLProjectionMatrix, cameraLMatrixWorld);
        // vec2 f = projectCamera(cameraTopRight, cameraLProjectionMatrix, cameraLMatrixWorld);
        // vec2 g = projectCamera(cameraBotLeft, cameraLProjectionMatrix, cameraLMatrixWorld);
        // vec2 h = projectCamera(cameraBotRight, cameraLProjectionMatrix, cameraLMatrixWorld);

        // if (distance(vUv, a) < 0.01) {
        //     remoteColor = vec4(1.0, 0.0, 0.0, 1.0);
        // }
        // if (distance(vUv, b) < 0.01) {
        //     remoteColor = vec4(0.0, 1.0, 0.0, 1.0);
        // }
        // if (distance(vUv, c) < 0.01) {
        //     remoteColor = vec4(0.0, 0.0, 1.0, 1.0);
        // }
        // if (distance(vUv, d) < 0.01) {
        //     remoteColor = vec4(1.0, 1.0, 0.0, 1.0);
        // }

        // if (distance(vUv, e) < 0.02) {
        //     remoteColor = vec4(0.5, 0.0, 1.0, 1.0);
        // }
        // if (distance(vUv, f) < 0.02) {
        //     remoteColor = vec4(0.5, 0.0, 0.0, 1.0);
        // }
        // if (distance(vUv, g) < 0.02) {
        //     remoteColor = vec4(0.0, 0.5, 0.0, 1.0);
        // }
        // if (distance(vUv, h) < 0.02) {
        //     remoteColor = vec4(0.0, 0.0, 0.5, 1.0);
        // }
    }
    else {
        remoteColor = texture2D( tRemoteColor, coordRemoteNormalized );
        remoteDepth = readDepth( tRemoteDepth, coordRemoteNormalized );
    }

    vec4 color;
    // if (!targetWidthGreater ||
    //     (targetWidthGreater && paddingLeft <= vUv.x && vUv.x <= paddingRight)) {
        if (remoteDepth <= localDepth)
            color = vec4(remoteColor.rgb, 1.0);
        else
            color = localColor;
    // }
    // else {
    //     color = localColor;
    // }

    // color = vec4(remoteColor.rgb, 1.0);
    // color = vec4(localColor.rgb, 1.0);
    gl_FragColor = color;

    // gl_FragColor.rgb = vec3(remoteDepth);
    // gl_FragColor.a = 1.0;
}
