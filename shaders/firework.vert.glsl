attribute vec2 a_position;
attribute float a_pointSize;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    gl_PointSize = a_pointSize;
}