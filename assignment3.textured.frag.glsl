#version 300 es

#define MAX_LIGHTS 16

// Fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision".
precision mediump float;

uniform bool u_show_normals;

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
    sampler2D map_kD;
    sampler2D map_nS;
    sampler2D map_norm;
};

// lights and materials
uniform AmbientLight u_lights_ambient[MAX_LIGHTS];
uniform DirectionalLight u_lights_directional[MAX_LIGHTS];
uniform PointLight u_lights_point[MAX_LIGHTS];

uniform Material u_material;

// camera position in world space
uniform vec3 u_eye;

// with webgl 2, we now have to define an out that will be the color of the fragment
out vec4 o_fragColor;

// received from vertex stage
// TODO: Create variables to receive from the vertex stage
in vec3 v_position;
in vec2 v_texture_coord;
in vec3 v_normal;
in mat3 v_tbn;

// Shades an ambient light and returns this light's contribution
vec3 shadeAmbientLight(Material material, AmbientLight light) {

    // TODO: Implement this
    // TODO: Include the material's map_kD to scale kA and to provide texture even in unlit areas
    // NOTE: We could use a separate map_kA for this, but most of the time we just want the same texture in unlit areas
    // HINT: Refer to http://paulbourke.net/dataformats/mtl/ for details
    // HINT: Parts of ./shaders/phong.frag.glsl can be re-used here

    vec3 kA = material.kA;
    if (textureSize(material.map_kD, 0).x > 0) {
        kA *= texture(material.map_kD, v_texture_coord).rgb;
    }

    return light.intensity * light.color * kA;
}

// Shades a directional light and returns its contribution
vec3 shadeDirectionalLight(Material material, DirectionalLight light, vec3 normal, vec3 eye, vec3 vertex_position) {
    
    // TODO: Implement this
    // TODO: Use the material's map_kD and map_nS to scale kD and shininess
    // HINT: The darker pixels in the roughness map (map_nS) are the less shiny it should be
    // HINT: Refer to http://paulbourke.net/dataformats/mtl/ for details
    // HINT: Parts of ./shaders/phong.frag.glsl can be re-used here

    vec3 result = vec3(0);
    vec3 kD = material.kD;
    float shininess = material.shininess;

    if (textureSize(material.map_kD, 0).x > 0) {
        kD *= texture(material.map_kD, v_texture_coord).rgb;
    }

    if (textureSize(material.map_nS, 0).x > 0) {
        shininess *= texture(material.map_nS, v_texture_coord).r;
    }

    vec3 N = normalize(normal);
    vec3 L = normalize(-light.direction);
    vec3 V = normalize(vertex_position - eye);


    // Diffuse
    float LN = max(dot(L, N), 0.0);
    result += LN * light.color * light.intensity * kD;

    // Specular
    vec3 R = reflect(L, N);
    result += pow( max(dot(R, V), 0.0), shininess) * light.color * light.intensity * material.kS;


    return result;
}

// Shades a point light and returns its contribution
vec3 shadePointLight(Material material, PointLight light, vec3 normal, vec3 eye, vec3 vertex_position) {

    // TODO: Implement this
    // TODO: Use the material's map_kD and map_nS to scale kD and shininess
    // HINT: The darker pixels in the roughness map (map_nS) are the less shiny it should be
    // HINT: Refer to http://paulbourke.net/dataformats/mtl/ for details
    // HINT: Parts of ./shaders/phong.frag.glsl can be re-used here

    vec3 result = vec3(0);
    vec3 kD = material.kD;
    float shininess = material.shininess;

    if (textureSize(material.map_kD, 0).x > 0) {
        kD *= texture(material.map_kD, v_texture_coord).rgb;
    }

    if (textureSize(material.map_nS, 0).x > 0) {
        shininess *= texture(material.map_nS, v_texture_coord).r;
    }

    vec3 N = normalize(normal);
    float D = distance(light.position, vertex_position);
    vec3 L = normalize(light.position - vertex_position);
    vec3 V = normalize(vertex_position - eye);

    // Diffuse
    float LN = max(dot(L, N), 0.0);
    result += LN * light.color * light.intensity * kD;

    // Specular
    vec3 R = reflect(L, N);
    result += pow( max(dot(R, V), 0.0), shininess) * light.color * light.intensity * material.kS;

    // Attenuation
    result *= 1.0 / (D*D+1.0);

    return result;
}

void main() {

    // TODO: Calculate the normal from the normal map and tbn matrix to get the world normal
    vec3 normal = normalize(v_normal);

    if (textureSize(u_material.map_norm, 0).x > 0) {
        vec3 world_normal = texture(u_material.map_norm, v_texture_coord).rgb * 2.0 - 1.0;
        normal = normalize(v_tbn * world_normal);
    }

    // if we only want to visualize the normals, no further computations are needed
    // !do not change this code!
    if (u_show_normals == true) {
        o_fragColor = vec4(normal, 1.0);
        return;
    }

    // we start at 0.0 contribution for this vertex
    vec3 light_contribution = vec3(0.0);

    // iterate over all possible lights and add their contribution
    for(int i = 0; i < MAX_LIGHTS; i++) {
        // TODO: Call your shading functions here like you did in A5
        if (u_lights_ambient[i].intensity > 0.0)
            light_contribution += shadeAmbientLight(u_material, u_lights_ambient[i]);

        if (u_lights_directional[i].intensity > 0.0)
            light_contribution += shadeDirectionalLight(u_material, u_lights_directional[i], normal, u_eye, v_position);
        
        if (u_lights_point[i].intensity > 0.0)
            light_contribution += shadePointLight(u_material, u_lights_point[i], normal, u_eye, v_position);
    }

    o_fragColor = vec4(light_contribution, 1.0);
}