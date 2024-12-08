#version 300 es

#define MAX_LIGHTS 16

// Fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision".
precision mediump float;

uniform bool u_show_normals;
uniform sampler2D u_shadowMap;
uniform highp mat4 u_lightVP; 


// struct definitions
struct AmbientLight {
    vec3 color;
    float intensity;
};

struct DirectionalLight {
    vec3 direction;
    vec3 color;
    float intensity;
};

struct PointLight {
    vec3 position;
    vec3 color;
    float intensity;
};

struct Material {
    vec3 kA;
    vec3 kD;
    vec3 kS;
    float shininess;
};

// lights and materials
uniform AmbientLight u_lights_ambient[MAX_LIGHTS];
uniform DirectionalLight u_lights_directional[MAX_LIGHTS];
uniform PointLight u_lights_point[MAX_LIGHTS];

uniform Material u_material;

// camera position
uniform vec3 u_eye;

// received from vertex stage
in vec3 o_vertex_normal_world;
in vec3 o_vertex_position_world;
in vec4 o_shadow_coord;

// with webgl 2, we now have to define an out that will be the color of the fragment
out vec4 o_fragColor;

float calculateShadow(vec4 shadowCoord, sampler2D shadowMap) {
    // Perspective divide and transform to [0, 1] range
    vec3 projCoords = shadowCoord.xyz / shadowCoord.w;
    projCoords = projCoords * 0.5 + 0.5;

    // Prevent shadow rendering outside light frustum
    if (projCoords.x < 0.0 || projCoords.x > 1.0 ||
        projCoords.y < 0.0 || projCoords.y > 1.0 ||
        projCoords.z > 1.0) {
        return 1.0;
    }

    float currentDepth = projCoords.z;
    float bias = 0.005;  // Small bias to prevent shadow acne

    // Percentage-Closer Filtering (PCF) for soft shadows
    float shadow = 0.0;
    vec2 texelSize = 1.0 / vec2(textureSize(shadowMap, 0));
    for(int x = -1; x <= 1; ++x) {
        for(int y = -1; y <= 1; ++y) {
            float pcfDepth = texture(shadowMap, projCoords.xy + vec2(x, y) * texelSize).r;
            shadow += currentDepth - bias > pcfDepth ? 0.0 : 1.0;
        }
    }
    shadow /= 9.0;

    return shadow;
}

// Shades an ambient light and returns this light's contribution
vec3 shadeAmbientLight(Material material, AmbientLight light) {
    if (light.intensity == 0.0)
        return vec3(0);

    return light.color * light.intensity * material.kA;
}

// Shades a directional light and returns its contribution
vec3 shadeDirectionalLight(Material material, DirectionalLight light, vec3 normal, vec3 eye, vec3 vertex_position) {
    vec3 result = vec3(0);
    if (light.intensity == 0.0)
        return result;

    vec3 N = normalize(normal);
    vec3 L = -normalize(light.direction);
    vec3 V = normalize(vertex_position - eye);


    // Diffuse
    float LN = max(dot(L, N), 0.0);
    result += LN * light.color * light.intensity * material.kD;

    // Specular
    vec3 R = reflect(L, N);
    result += pow( max(dot(R, V), 0.0), material.shininess) * light.color * light.intensity * material.kS;

    return result;
}

vec3 shadePointLight(Material material, PointLight light, vec3 normal, vec3 eye, vec3 vertex_position, mat4 lightVP, sampler2D shadowMap) {
    vec3 lightContribution = vec3(0);

    // Shadow calculation
    vec4 shadowCoord = lightVP * vec4(vertex_position, 1.0);
    float shadow = calculateShadow(shadowCoord, shadowMap);

    // Diffuse and specular calculations (existing logic)
    vec3 N = normalize(normal);
    vec3 L = normalize(light.position - vertex_position);
    float LN = max(dot(N, L), 0.0);
    vec3 diffuse = LN * light.color * material.kD;

    vec3 R = reflect(-L, N);
    vec3 V = normalize(eye - vertex_position);
    float RV = pow(max(dot(R, V), 0.0), material.shininess);
    vec3 specular = RV * light.color * material.kS;

    // Apply shadow factor
    lightContribution = shadow * (diffuse + specular);

    return lightContribution;
}

void main() {
    if (u_show_normals) {
        o_fragColor = vec4(o_vertex_normal_world, 1.0);
        return;
    }

    vec3 light_contribution = vec3(0.0);

    // Calculate shadow based on light view projection
    float shadowFactor = calculateShadow(o_shadow_coord, u_shadowMap);

    for(int i = 0; i < MAX_LIGHTS; i++) {
        light_contribution += shadeAmbientLight(u_material, u_lights_ambient[i]);
        light_contribution += shadeDirectionalLight(u_material, u_lights_directional[i], o_vertex_normal_world, u_eye, o_vertex_position_world);
        
        // Apply shadow factor to point light
        vec3 pointLightContribution = shadePointLight(u_material, u_lights_point[i], o_vertex_normal_world, u_eye, o_vertex_position_world, u_lightVP, u_shadowMap);
        light_contribution += shadowFactor * pointLightContribution;
    }

    o_fragColor = vec4(light_contribution, 1.0);

}