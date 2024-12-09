#version 300 es

// an attribute will receive data from a buffer
in vec2 a_position;

uniform vec2 u_resolution;

void main() {

    // convert the position from pixels to 0.0 to 1.0
    vec2 zeroToOne = a_position / u_resolution;

    // convert from 0->1 to 0->2
    vec2 zeroToTwo = zeroToOne * 2.0;

    // convert from 0->2 to -1->+1 (clipspace)
    vec2 clipSpace = zeroToTwo - 1.0;

    // gl_Position is a special variable a vertex shader
    // is responsible for setting the output location in clip coords
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

    // gl_PointSize is alsoa  special variable that's sole purpose
    // is to set the point size of any points that we want to draw
    gl_PointSize = 10.0;
}