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
uniform bool preferLocal;

uniform ivec2 localSize;
uniform ivec2 remoteSize;

uniform mat4 cameraLProjectionMatrix;
uniform mat4 cameraLMatrixWorld;

uniform mat4 remoteLProjectionMatrix;
uniform mat4 remoteLMatrixWorld;

uniform mat4 cameraRProjectionMatrix;
uniform mat4 cameraRMatrixWorld;

uniform mat4 remoteRProjectionMatrix;
uniform mat4 remoteRMatrixWorld;

uniform vec3 remoteLForward;

float readDepth(sampler2D depthSampler, vec2 coord) {
    float depth = texture2D( depthSampler, coord ).x;
    return depth;
}

vec3 matrixWorldToPosition(mat4 matrixWorld) {
    return vec3(matrixWorld[3]);
}

vec3 viewportPointToRay(vec2 point, mat4 projectionMatrix, mat4 viewMatrix) {
    vec2 ndc = (2.0 * point) - 1.0;
    vec4 clip = vec4(ndc, -1.0, 1.0);
    vec4 eye = inverse(projectionMatrix) * clip;
    eye = vec4(eye.xy, -1.0, 0.0);
    vec3 world = (viewMatrix * eye).xyz;
    return normalize(world);
}

float LinearEyeDepth(float depth) {
    return (2.0 * cameraNear) / (cameraFar + cameraNear - depth * (cameraFar - cameraNear));
    // float viewZ = perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
    // viewZ = viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
    // return viewZ;
}

vec3 getWorldPos(vec3 cameraVector, vec3 cameraForward, vec3 cameraPos, vec2 uv) {
    float d = dot(cameraForward, cameraVector);
    float sceneDistance = (texture2D(tRemoteDepth, uv).x) / d;
    vec3 worldPos = cameraPos + cameraVector * sceneDistance;
    return worldPos;
}

vec2 worldToScreenPos(vec3 pos, mat4 cameraProjection, mat4 worldToCamera, vec3 cameraPosition) {
    float nearPlane = cameraNear;
    float farPlane = cameraFar;
    float textureWidth = float(localSize.x);
    float textureHeight = float(localSize.y);

    vec3 samplePos = normalize(pos - cameraPosition) * (nearPlane + (farPlane - nearPlane)) + cameraPosition;
    vec3 toCam = vec3(worldToCamera * vec4(samplePos, 1.0));
    float camPosZ = toCam.z;
    float height = 2.0 * camPosZ / cameraProjection[1][1];
    float width = (textureWidth / textureHeight) * height;

    vec2 uv;
    if (!hasDualCameras) {
        uv.x = 1.0 - (toCam.x + width / 2.0) / width;
    }
    else {
        if (vUv.x < 0.5) {
            uv.x = 0.5 - (toCam.x + (width / 2.0) / 2.0) / width;
        }
        else {
            uv.x = 0.5 - (toCam.x + (width / 2.0) / 2.0) / width + 0.5;
        }
    }
    uv.y = 1.0 - (toCam.y + height / 2.0) / height;
    return uv;
}

void main() {
    vec2 remoteSizeF = vec2(remoteSize);
    vec2 localSizeF = vec2(localSize);

    // calculate new dimensions, maintaining aspect ratio
    float aspect = remoteSizeF.x / remoteSizeF.y;
    int newHeight = localSize.y;
    int newWidth = int(float(newHeight) * aspect);

    // calculate left and right padding offset
    int totalPad = abs(localSize.x - newWidth);
    float padding = float(totalPad / 2);
    float paddingLeft = padding / localSizeF.x;
    float paddingRight = 1.0 - paddingLeft;

    bool targetWidthGreater = localSize.x > newWidth;

    vec2 coordLocalNormalized = vUv;
    vec2 coordLocalColor = coordLocalNormalized;
    vec2 coordLocalDepth = coordLocalNormalized;

    vec4 localColor = texture2D( tLocalColor, coordLocalColor );
    float localDepth = readDepth( tLocalDepth, coordLocalDepth );

    vec2 coordRemoteNormalized = vUv;
    vec2 coordRemoteColor = coordRemoteNormalized;
    vec2 coordRemoteDepth = coordRemoteNormalized;

    vec4 remoteColor;  // = texture2D( tRemoteColor, coordRemoteNormalized );
    float remoteDepth; // = readDepth( tRemoteDepth, coordRemoteNormalized );

    if (doAsyncTimeWarp) {
        bool occluded = false;
        bool missed = false;
        vec3 cameraTopLeft, cameraTopRight, cameraBotLeft, cameraBotRight;

        if (!hasDualCameras) {
            float x = vUv.x;
            vec3 cameraPos = matrixWorldToPosition(cameraLMatrixWorld);
            vec3 remotePos = matrixWorldToPosition(remoteLMatrixWorld);

            cameraTopLeft  = viewportPointToRay(vec2(0.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
            cameraTopRight = viewportPointToRay(vec2(1.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
            cameraBotLeft  = viewportPointToRay(vec2(0.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);
            cameraBotRight = viewportPointToRay(vec2(1.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);

            vec3 cameraVector = mix( mix(cameraTopLeft, cameraTopRight, x),
                                     mix(cameraBotLeft, cameraBotRight, x),
                                     1.0 - vUv.y );

            vec2 uv3 = worldToScreenPos(remotePos + cameraVector, remoteLProjectionMatrix, inverse(remoteLMatrixWorld), remotePos);

            // vec3 CurrentPos = cameraPos;
            // // raymarch through the frozen cameras depth buffer, there are three possible resutls
            // // 1. surface hit
            // // 2. miss (hit skybox or something)
            // // 3. occluded (went behind something without hitting it.
            // int steps = 100;
            // float DistanceFromWorldToPos;
            // for (int i = 0; i < steps; i++) {
            //     float StepSize = 30.0 / float(steps);
            //     CurrentPos += (cameraVector * StepSize);

            //     vec2 uv4 = worldToScreenPos(CurrentPos, remoteLProjectionMatrix, inverse(remoteLMatrixWorld), remotePos);
            //     vec3 tracedPos = getWorldPos(normalize(CurrentPos - remotePos), remoteLForward, remotePos, uv4);

            //     float DistanceToCurrentPos = distance(remotePos, CurrentPos);
            //     float DistanceToWorld = distance(remotePos, tracedPos);
            //     DistanceFromWorldToPos = DistanceToCurrentPos - DistanceToWorld;
            //     if (DistanceFromWorldToPos > StepSize) {
            //         occluded = true;
            //     }
            //     if (DistanceFromWorldToPos > 0.0) {
            //         break;
            //     }
            //     if (i == (steps-1)) {
            //         missed = true;
            //     }
            // }
            // uv3 = worldToScreenPos(CurrentPos, remoteLProjectionMatrix, inverse(remoteLMatrixWorld), remotePos);

            coordRemoteNormalized = uv3;
            coordRemoteColor = coordRemoteNormalized;
            coordRemoteDepth = coordRemoteColor;

            // if (targetWidthGreater) {
            //     coordRemoteColor.x = (coordRemoteNormalized.x * localSizeF.x - padding) / float(localSize.x - totalPad);
            // }
            // else {
            //     coordRemoteColor.x = (coordRemoteNormalized.x * localSizeF.x + padding) / float(newWidth);
            // }
            // coordRemoteColor.y = coordRemoteNormalized.y;
        }
        else { // left eye
            if (vUv.x < 0.5) {
                float x = 2.0 * vUv.x;
                vec3 cameraPos = matrixWorldToPosition(cameraLMatrixWorld);
                vec3 remotePos = matrixWorldToPosition(remoteLMatrixWorld);

                cameraTopLeft  = viewportPointToRay(vec2(0.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
                cameraTopRight = viewportPointToRay(vec2(1.0, 1.0), cameraLProjectionMatrix, cameraLMatrixWorld);
                cameraBotLeft  = viewportPointToRay(vec2(0.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);
                cameraBotRight = viewportPointToRay(vec2(1.0, 0.0), cameraLProjectionMatrix, cameraLMatrixWorld);

                vec3 cameraVector = mix( mix(cameraTopLeft, cameraTopRight, x),
                                         mix(cameraBotLeft, cameraBotRight, x),
                                         1.0 - vUv.y );

                vec2 uv3 = worldToScreenPos(remotePos + cameraVector, remoteLProjectionMatrix, inverse(remoteLMatrixWorld), remotePos);

                coordRemoteNormalized = uv3;
                coordRemoteColor = coordRemoteNormalized;
                // coordRemoteColor.x = coordRemoteColor.x / 2.0;
                coordRemoteDepth = coordRemoteColor;
            }
            else { // right eye
                float x = 2.0 * (vUv.x - 0.5);
                vec3 cameraPos = matrixWorldToPosition(cameraRMatrixWorld);
                vec3 remotePos = matrixWorldToPosition(remoteRMatrixWorld);

                cameraTopLeft  = viewportPointToRay(vec2(0.0, 1.0), cameraRProjectionMatrix, cameraRMatrixWorld);
                cameraTopRight = viewportPointToRay(vec2(1.0, 1.0), cameraRProjectionMatrix, cameraRMatrixWorld);
                cameraBotLeft  = viewportPointToRay(vec2(0.0, 0.0), cameraRProjectionMatrix, cameraRMatrixWorld);
                cameraBotRight = viewportPointToRay(vec2(1.0, 0.0), cameraRProjectionMatrix, cameraRMatrixWorld);

                vec3 cameraVector = mix( mix(cameraTopLeft, cameraTopRight, x),
                                         mix(cameraBotLeft, cameraBotRight, x),
                                         1.0 - vUv.y );

                vec2 uv3 = worldToScreenPos(remotePos + cameraVector, remoteRProjectionMatrix, inverse(remoteRMatrixWorld), remotePos);

                coordRemoteNormalized = uv3;
                coordRemoteColor = coordRemoteNormalized;
                // coordRemoteColor.x = coordRemoteColor.x / 2.0 + 0.5;
                coordRemoteDepth = coordRemoteColor;
            }
        }

        float xMin = ((!hasDualCameras || vUv.x < 0.5) ? 0.0 : 0.5);
        float xMax = ((!hasDualCameras || vUv.x >= 0.5) ? 1.0 : 0.5);
        if (!stretchBorders) {
            remoteColor = texture2D( tRemoteColor, coordRemoteColor );
            remoteDepth = readDepth( tRemoteDepth, coordRemoteDepth );

            if (coordRemoteColor.x < xMin || coordRemoteColor.x > xMax ||
                coordRemoteColor.y < 0.0  || coordRemoteColor.y > 1.0) {
                remoteColor = vec4(0.0);
            }
        }
        else {
            coordRemoteNormalized.x = max(coordRemoteNormalized.x, xMin);
            coordRemoteNormalized.x = min(coordRemoteNormalized.x, xMax);
            coordRemoteNormalized.y = max(coordRemoteNormalized.y, 0.0);
            coordRemoteNormalized.y = min(coordRemoteNormalized.y, 1.0);
            remoteColor = texture2D( tRemoteColor, coordRemoteNormalized );
            remoteDepth = readDepth( tRemoteDepth, coordRemoteNormalized );
        }
    }
    else {
        remoteColor = texture2D( tRemoteColor, coordRemoteColor );
        remoteDepth = readDepth( tRemoteDepth, coordRemoteDepth );
    }

    vec4 color = localColor;
    // if (!targetWidthGreater ||
    //     (targetWidthGreater && paddingLeft <= vUv.x && vUv.x <= paddingRight)) {
        if ((preferLocal && remoteDepth < localDepth) || (!preferLocal && remoteDepth <= localDepth))
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
