(function () {
  const shaderTargets = document.querySelectorAll('[data-nadi-shader]');

  function makeShader(canvas) {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return null;

    const vSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fSource = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        float t = u_time * 0.18;

        vec3 c1 = vec3(0.09, 0.30, 0.23);
        vec3 c2 = vec3(0.18, 0.49, 0.36);
        vec3 c3 = vec3(0.91, 0.96, 0.92);

        float waveA = sin((uv.x + t) * 5.5) * cos((uv.y + t * 1.2) * 4.0);
        float waveB = sin((uv.y - t * 1.4) * 6.0 + 1.7) * cos((uv.x - t * 0.8) * 5.0);
        float blend = 0.5 + 0.5 * (waveA + waveB) * 0.5;

        vec3 color = mix(c1, c2, smoothstep(0.0, 1.0, blend));
        color = mix(color, c3, 0.35 + 0.3 * (1.0 - length(uv)));

        float glow = 0.05 * sin(8.0 * length(uv) - u_time * 1.2);
        color += glow;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function compileShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    }

    const vertex = compileShader(gl.VERTEX_SHADER, vSource);
    const fragment = compileShader(gl.FRAGMENT_SHADER, fSource);
    if (!vertex || !fragment) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return null;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]), gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(program, 'a_position');
    gl.useProgram(program);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'u_time');
    const uResolution = gl.getUniformLocation(program, 'u_resolution');

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    }

    function render(now) {
      resize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.uniform1f(uTime, now * 0.001);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
    return program;
  }

  shaderTargets.forEach((target) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'nadi-shader-canvas';
    target.appendChild(canvas);
    makeShader(canvas);
  });
})();
