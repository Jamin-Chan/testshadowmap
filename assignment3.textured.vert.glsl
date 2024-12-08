#version 300 es

// an attribute will receive data from a buffer
in vec3 a_position;
in vec3 a_normal;
in vec3 a_tangent;
in vec2 a_texture_coord;

// transformation matrices
uniform mat4x4 u_m;
uniform mat4x4 u_v;
uniform mat4x4 u_p;

// output to fragment stage
// TODO: Create varyings to pass data to the fragment stage (position, texture coords, and more)
out vec3 v_position;
out vec2 v_texture_coord;
out vec3 v_normal;
out mat3 v_tbn;

void main() {

    // transform a vertex from object space directly to screen space
    // the full chain of transformations is:
    // object space -{model}-> world space -{view}-> view space -{projection}-> clip space
    vec4 vertex_position_world = u_m * vec4(a_position, 1.0);

    // TODO: Construct TBN matrix from normals, tangents and bitangents
    // TODO: Use the Gram-Schmidt process to re-orthogonalize tangents
    // NOTE: Different from the book, try to do all calculations in world space using the TBN to transform normals
    // HINT: Refer to https://learnopengl.com/Advanced-Lighting/Normal-Mapping for all above
    mat3 tbn = mat3(0);

    // TODO: Forward data to fragment stage

    mat3 normal_matrix = transpose(inverse(mat3(u_m)));
    vec3 N = normalize(normal_matrix * a_normal);

    vec3 T = normalize(normal_matrix * a_tangent);

    T = normalize(T - dot(T, N) * N);

    vec3 B = cross(N, T);

    v_position = vertex_position_world.xyz;
    v_texture_coord = a_texture_coord;
    v_normal = N;
    v_tbn = mat3(T, B, N);

    gl_Position = u_p * u_v * vertex_position_world;

}