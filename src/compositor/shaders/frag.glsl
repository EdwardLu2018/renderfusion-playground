#include <packing>

varying vec2 vUv;

uniform sampler2D tLocalColor, tLocalDepth;
uniform sampler2D tRemoteColor, tRemoteDepth;
uniform sampler2D tBackgroundColor;

uniform float cameraNear, cameraFar;

uniform bool hasDualCameras;
uniform bool arMode, vrMode;

uniform bool doAsyncTimeWarp;
uniform bool stretchBorders;
uniform bool lowPolyInFill;
uniform bool reprojectMovement;
uniform bool preferLocal;

uniform ivec2 localSize, remoteSize, backgroundSize;

uniform vec3 remoteLForward, remoteRForward;

uniform mat4 cameraLProjectionMatrix, cameraLMatrixWorld;
uniform mat4 remoteLProjectionMatrix, remoteLMatrixWorld;
uniform mat4 cameraRProjectionMatrix, cameraRMatrixWorld;
uniform mat4 remoteRProjectionMatrix, remoteRMatrixWorld;

uniform mat4 cameraLProjectionMatrixInverse, cameraLMatrixWorldInverse;
uniform mat4 remoteLProjectionMatrixInverse, remoteLMatrixWorldInverse;
uniform mat4 cameraRProjectionMatrixInverse, cameraRMatrixWorldInverse;
uniform mat4 remoteRProjectionMatrixInverse, remoteRMatrixWorldInverse;

const float onePixel = (1.0 / 255.0);

// adapted from: https://gist.github.com/hecomi/9580605
float linear01Depth(float depth) {
    float x = 1.0 - cameraFar / cameraNear;
    float y = cameraFar / cameraNear;
    float z = x / cameraFar;
    float w = y / cameraFar;
    return 1.0 / (x * depth + y);
}

// adapted from: https://gist.github.com/hecomi/9580605
float linearEyeDepth(float depth) {
    float x = 1.0 - cameraFar / cameraNear;
    float y = cameraFar / cameraNear;
    float z = x / cameraFar;
    float w = y / cameraFar;
    return 1.0 / (z * depth + w);
}

float readDepthRemote(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).r;
    return linear01Depth(depth);
}

float readDepthLocal(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).r;
    return linear01Depth(depth);
}

vec3 matrixWorldToPosition(mat4 matrixWorld) {
    return vec3(matrixWorld[3]);
}

vec3 cameraToWorld(vec2 uv, mat4 projectionMatrixInverse, mat4 matrixWorld) {
    vec2 ndc = 2.0 * uv - 1.0;
    vec4 uv4 = matrixWorld * projectionMatrixInverse * vec4(ndc, 1.0, 1.0);
    vec3 uv3 = vec3(uv4 / uv4.w);
    return uv3;
}

vec2 worldToCamera(vec3 pt, mat4 projectionMatrix, mat4 matrixWorldInverse) {
    vec4 uv4 = projectionMatrix * matrixWorldInverse * vec4(pt, 1.0);
    vec2 uv2 = vec2(uv4 / uv4.w);
    return (uv2 + 1.0) / 2.0;
}

vec3 getWorldPos(vec3 cameraVector, vec3 cameraForward, vec3 cameraPos, vec2 uv) {
    float d = dot(cameraForward, cameraVector);
    float sceneDistance = linearEyeDepth(texture2D(tRemoteDepth, uv).r) / d;
    vec3 worldPos = cameraPos + cameraVector * sceneDistance;
    return worldPos;
}

void main() {
    // vec2 remoteSizeF = vec2(remoteSize);
    // vec2 localSizeF = vec2(localSize);

    // // calculate new dimensions, maintaining aspect ratio
    // float aspect = remoteSizeF.x / remoteSizeF.y;
    // int newHeight = localSize.y;
    // int newWidth = int(aspect * float(newHeight));

    // // calculate left and right padding offset
    // int totalPad = abs(localSize.x - newWidth);
    // float padding = float(totalPad / 2);
    // float paddingLeft = padding / localSizeF.x;
    // float paddingRight = 1.0 - paddingLeft;

    // bool targetWidthGreater = localSize.x > newWidth;

    vec2 uvLocal = vUv;

    vec2 coordLocalColor = uvLocal;
    vec2 coordLocalDepth = uvLocal;

    vec4 localColor  = texture2D( tLocalColor, coordLocalColor );
    float localDepth = readDepthLocal( tLocalDepth, coordLocalDepth );

    vec4 backgroundColor  = lowPolyInFill ? texture2D( tBackgroundColor, coordLocalColor ) : vec4(0.0);

    vec2 coordRemoteColor = uvLocal;
    vec2 coordRemoteDepth = uvLocal;

    vec4 remoteColor;  // = texture2D( tRemoteColor, coordRemoteColor );
    float remoteDepth; // = readDepth( tRemoteDepth, coordRemoteDepth );

    bool oneCamera = !hasDualCameras;
    bool leftEye   = (hasDualCameras && uvLocal.x < 0.5);
    bool rightEye  = (hasDualCameras && uvLocal.x >= 0.5);

    if (doAsyncTimeWarp) {
        bool occluded = false;

        vec3 cameraPos                     = matrixWorldToPosition(cameraLMatrixWorld);
        vec3 remotePos                     = matrixWorldToPosition(remoteLMatrixWorld);
        vec3 remoteForward                 = remoteLForward;
        mat4 cameraProjectionMatrix        = cameraLProjectionMatrix;
        mat4 cameraMatrixWorld             = cameraLMatrixWorld;
        mat4 remoteProjectionMatrix        = remoteLProjectionMatrix;
        mat4 remoteMatrixWorld             = remoteLMatrixWorld;
        mat4 cameraProjectionMatrixInverse = cameraLProjectionMatrixInverse;
        mat4 cameraMatrixWorldInverse      = cameraLMatrixWorldInverse;
        mat4 remoteProjectionMatrixInverse = remoteLProjectionMatrixInverse;
        mat4 remoteMatrixWorldInverse      = remoteLMatrixWorldInverse;

        if (leftEye) {
            uvLocal.x = 2.0 * uvLocal.x;
        }
        if (rightEye) {
            uvLocal.x = 2.0 * (uvLocal.x - 0.5);
            cameraPos                     = matrixWorldToPosition(cameraRMatrixWorld);
            remotePos                     = matrixWorldToPosition(remoteRMatrixWorld);
            cameraProjectionMatrix        = cameraRProjectionMatrix;
            cameraMatrixWorld             = cameraRMatrixWorld;
            remoteForward                 = remoteRForward;
            remoteProjectionMatrix        = remoteRProjectionMatrix;
            remoteMatrixWorld             = remoteRMatrixWorld;
            cameraProjectionMatrixInverse = cameraRProjectionMatrixInverse;
            cameraMatrixWorldInverse      = cameraRMatrixWorldInverse;
            remoteProjectionMatrixInverse = remoteRProjectionMatrixInverse;
            remoteMatrixWorldInverse      = remoteRMatrixWorldInverse;
        }

        vec3 pt = cameraToWorld(uvLocal, cameraProjectionMatrixInverse, cameraMatrixWorld);
        vec2 uvRemote = worldToCamera(pt, remoteProjectionMatrix, remoteMatrixWorldInverse);

        if (reprojectMovement) {
            vec3 cameraVector = normalize(pt - cameraPos);

            if (!(arMode || vrMode)) {
                vec3 cameraTopLeft  = normalize(cameraToWorld(vec2(0.0, 1.0), cameraProjectionMatrixInverse, cameraMatrixWorld) - cameraPos);
                vec3 cameraTopRight = normalize(cameraToWorld(vec2(1.0, 1.0), cameraProjectionMatrixInverse, cameraMatrixWorld) - cameraPos);
                vec3 cameraBotLeft  = normalize(cameraToWorld(vec2(0.0, 0.0), cameraProjectionMatrixInverse, cameraMatrixWorld) - cameraPos);
                vec3 cameraBotRight = normalize(cameraToWorld(vec2(1.0, 0.0), cameraProjectionMatrixInverse, cameraMatrixWorld) - cameraPos);

                cameraVector = mix( mix(cameraTopLeft, cameraTopRight, uvLocal.x),
                                    mix(cameraBotLeft, cameraBotRight, uvLocal.x),
                                    1.0 - uvLocal.y );
            }

            vec3 currentPos = cameraPos;

            int steps = 100;
            float stepSize = 30.0 / float(steps);

            float distanceFromWorldToPos;
            for (int i = 0; i < steps; i++) {
                currentPos += (cameraVector * stepSize);

                uvRemote = worldToCamera(currentPos, remoteProjectionMatrix, remoteMatrixWorldInverse);
                vec2 uvDepth = uvRemote;
                if (leftEye) {
                    uvDepth.x = uvDepth.x / 2.0;
                }
                if (rightEye) {
                    uvDepth.x = uvDepth.x / 2.0 + 0.5;
                }
                vec3 tracedPos = getWorldPos(normalize(currentPos - remotePos), remoteForward, remotePos, uvDepth);

                float distanceToCurrentPos = distance(remotePos, currentPos);
                float distanceToWorld = distance(remotePos, tracedPos);

                distanceFromWorldToPos = distanceToCurrentPos - distanceToWorld;
                if (distanceFromWorldToPos > stepSize) {
                    occluded = true;
                }
                if (distanceFromWorldToPos > 0.0) {
                    break;
                }
            }
        }

        coordRemoteColor = uvRemote;
        coordRemoteDepth = coordRemoteColor;

        if (leftEye) {
            coordRemoteColor.x = coordRemoteColor.x / 2.0;
            coordRemoteDepth = coordRemoteColor;
        }
        if (rightEye) {
            coordRemoteColor.x = coordRemoteColor.x / 2.0 + 0.5;
            coordRemoteDepth = coordRemoteColor;
        }

        float xMin = ((oneCamera || leftEye)  ? 0.0 : 0.5);
        float xMax = ((oneCamera || rightEye) ? 1.0 : 0.5);
        if (lowPolyInFill || !stretchBorders) {
            remoteColor = texture2D( tRemoteColor, coordRemoteColor );
            remoteDepth = readDepthRemote( tRemoteDepth, coordRemoteDepth );
            if (coordRemoteColor.x < xMin || coordRemoteColor.x > xMax ||
                coordRemoteColor.y < 0.0  || coordRemoteColor.y > 1.0) {
                remoteColor = backgroundColor;
            }
        }
        else {
            coordRemoteColor.x = min(max(coordRemoteColor.x, xMin), xMax - 0.001);
            coordRemoteColor.y = min(max(coordRemoteColor.y, 0.0), 1.0);
            coordRemoteDepth = coordRemoteColor;
            remoteColor = texture2D( tRemoteColor, coordRemoteColor );
            remoteDepth = readDepthRemote( tRemoteDepth, coordRemoteDepth );
        }

        if (reprojectMovement && occluded) {
            remoteColor = vec4(0.0);
            if (stretchBorders || lowPolyInFill) {
                vec2 offsetUVLeft      = coordRemoteColor + vec2(1.0, 0.0)  * 0.01;
                vec2 offsetUVRight     = coordRemoteColor + vec2(0.0, 1.0)  * 0.01;
                vec2 offsetUVTop       = coordRemoteColor + vec2(-1.0, 0.0) * 0.01;
                vec2 offsetUVDown      = coordRemoteColor + vec2(0.0, -1.0) * 0.01;

                vec4 remoteColorLeft   = texture2D(tRemoteColor, offsetUVLeft );
                vec4 remoteColorRight  = texture2D(tRemoteColor, offsetUVRight);
                vec4 remoteColorTop    = texture2D(tRemoteColor, offsetUVTop  );
                vec4 remoteColorDown   = texture2D(tRemoteColor, offsetUVDown );

                float remoteDepth0     = linearEyeDepth(texture2D(tRemoteDepth, coordRemoteColor).r);
                float remoteDepthLeft  = linearEyeDepth(texture2D(tRemoteDepth, offsetUVLeft    ).r);
                float remoteDepthRight = linearEyeDepth(texture2D(tRemoteDepth, offsetUVRight   ).r);
                float remoteDepthTop   = linearEyeDepth(texture2D(tRemoteDepth, offsetUVTop     ).r);
                float remoteDepthDown  = linearEyeDepth(texture2D(tRemoteDepth, offsetUVDown    ).r);

                // find the furthest away one of these five samples
                float remoteDepth = max(max(max(max(remoteDepth0, remoteDepthLeft), remoteDepthRight), remoteDepthTop), remoteDepthDown);
                if (remoteDepth == remoteDepthLeft) {
                    remoteColor = preferLocal ? localColor : (lowPolyInFill ? backgroundColor : remoteColorLeft);
                }
                if (remoteDepth == remoteDepthRight) {
                    remoteColor = preferLocal ? localColor : (lowPolyInFill ? backgroundColor : remoteColorRight);
                }
                if (remoteDepth == remoteDepthTop) {
                    remoteColor = preferLocal ? localColor : (lowPolyInFill ? backgroundColor : remoteColorTop);
                }
                if (remoteDepth == remoteDepthDown) {
                    remoteColor = preferLocal ? localColor : (lowPolyInFill ? backgroundColor : remoteColorDown);
                }
            }
        }
    }
    else {
        remoteColor = texture2D( tRemoteColor, coordRemoteColor );
        remoteDepth = readDepthLocal( tRemoteDepth, coordRemoteDepth );
    }

    // force srgb
#ifdef IS_SRGB
    localColor = LinearTosRGB(localColor);
#endif

    vec4 color = localColor;
    // if (!targetWidthGreater ||
    //     (targetWidthGreater && paddingLeft <= uvLocal.x && uvLocal.x <= paddingRight)) {
        if ((preferLocal && remoteDepth < localDepth) || (!preferLocal && remoteDepth <= localDepth)) {
            color = vec4(remoteColor.rgb, 1.0);
            // handle passthrough
            if (arMode && remoteDepth >= (1.0-(5.0*onePixel))) {
                color = localColor;
            }
        }
    // }
    // else {
    //     color = localColor;
    // }

    // const float margin = 0.25;
    // if (!( (margin < uvLocal.x) && (uvLocal.x < 1.0 - margin) && (margin < uvLocal.y) && (uvLocal.y < 1.0 - margin) ) )
    //     color = localColor;

    // color = vec4(remoteColor.rgb, 1.0);
    // color = vec4(localColor.rgb, 1.0);
    // color = vec4(backgroundColor.rgb, 1.0);
    gl_FragColor = color;

    // gl_FragColor.rgb = vec3(remoteDepth);
    // gl_FragColor.a = 1.0;
}
