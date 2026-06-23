// Vision Stick - Visor STL compatible sin importmap
// Usa Three.js global para evitar que el visor quede pegado en "Preparando modelo 3D".

(function () {
  const viewers = document.querySelectorAll('.model-viewer');

  function getFileName(src) {
    return (src || '').split('/').pop();
  }

  function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function showError(container, message) {
    container.innerHTML = `
      <div class="model-error">
        <div>
          <strong>No se pudo mostrar la vista 3D.</strong><br>
          ${message}<br>
          <small>El archivo STL igual está disponible para descarga.</small>
        </div>
      </div>
    `;
  }

  function setLoading(container, text) {
    const loading = container.querySelector('.model-loading');
    if (loading) loading.textContent = text;
  }

  function checkLibraries(container) {
    if (!window.THREE) {
      showError(container, 'No cargó Three.js. Revisa tu conexión a internet o prueba abrir la página desde GitHub Pages / Live Server.');
      return false;
    }

    if (!THREE.STLLoader || !THREE.OrbitControls) {
      showError(container, 'No cargaron las librerías del visor 3D. Revisa la conexión a internet y el orden de los scripts en materiales.html.');
      return false;
    }

    return true;
  }

  function loadSTLGeometry(src, loader, container) {
    const fileName = getFileName(src);

    if (window.VS_STL_MODELS && window.VS_STL_MODELS[fileName]) {
      setLoading(container, 'Cargando modelo 3D...');
      const buffer = base64ToArrayBuffer(window.VS_STL_MODELS[fileName]);
      return Promise.resolve(loader.parse(buffer));
    }

    return new Promise((resolve, reject) => {
      loader.load(
        src,
        geometry => resolve(geometry),
        xhr => {
          if (xhr.lengthComputable) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            setLoading(container, `Cargando modelo 3D... ${percent}%`);
          }
        },
        error => reject(error)
      );
    });
  }

  function fitCameraToObject(camera, object, controls) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const distance = maxDim * 2.55;

    camera.position.set(center.x + distance, center.y + distance * 0.8, center.z + distance);
    camera.near = Math.max(distance / 100, 0.01);
    camera.far = distance * 160;
    camera.updateProjectionMatrix();

    controls.target.copy(center);
    controls.update();
  }

  function createViewer(container) {
    if (container.dataset.loaded === 'true') return;
    container.dataset.loaded = 'true';

    if (!checkLibraries(container)) return;

    const src = container.dataset.src;
    const width = container.clientWidth || 520;
    const height = container.clientHeight || 380;

    container.innerHTML = '<div class="model-loading">Cargando modelo 3D...</div>';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f8ff);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 10000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const loading = container.querySelector('.model-loading');
    container.appendChild(renderer.domElement);
    if (loading) container.appendChild(loading);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.85;
    controls.panSpeed = 0.65;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xdbeafe, 1.15));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
    keyLight.position.set(70, 95, 110);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.55);
    fillLight.position.set(-80, -45, 75);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.45);
    rimLight.position.set(-30, 80, -100);
    scene.add(rimLight);

    const grid = new THREE.GridHelper(140, 14, 0xcbd5e1, 0xe2e8f0);
    grid.position.y = -20;
    scene.add(grid);

    let model = null;
    const loader = new THREE.STLLoader();

    loadSTLGeometry(src, loader, container)
      .then(geometry => {
        const overlay = container.querySelector('.model-loading');
        if (overlay) overlay.remove();

        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const box = geometry.boundingBox;
        const center = box.getCenter(new THREE.Vector3());
        geometry.translate(-center.x, -center.y, -center.z);

        const material = new THREE.MeshStandardMaterial({
          color: 0x2563eb,
          roughness: 0.5,
          metalness: 0.12
        });

        model = new THREE.Mesh(geometry, material);
        model.rotation.x = -Math.PI / 2;
        scene.add(model);

        fitCameraToObject(camera, model, controls);
        resize();
      })
      .catch(error => {
        console.error('Error cargando STL:', src, error);
        showError(container, 'Revisa que el archivo STL exista en la carpeta assets y que la página se esté abriendo desde Live Server o GitHub Pages.');
      });

    function animate() {
      requestAnimationFrame(animate);
      if (!renderer.domElement.isConnected) return;
      controls.update();
      renderer.render(scene, camera);
    }

    function resize() {
      const w = container.clientWidth || width;
      const h = container.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    animate();
    window.addEventListener('resize', resize);

    const card = container.closest('.model-card');
    const reset = card?.querySelector('.model-reset');
    reset?.addEventListener('click', () => {
      if (model) fitCameraToObject(camera, model, controls);
    });
  }

  function initWhenVisible(container) {
    if (!('IntersectionObserver' in window)) {
      createViewer(container);
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          observer.disconnect();
          createViewer(container);
        }
      });
    }, { rootMargin: '300px' });

    observer.observe(container);
  }

  function init() {
    if (!viewers.length) return;
    viewers.forEach(initWhenVisible);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
