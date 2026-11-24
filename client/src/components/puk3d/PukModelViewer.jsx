import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './pukModelViewer.css';

const MODEL_URL = '/dev/puk/pukmodel.glb';
const SCREEN_NAME = 'pukscreen';
const AUTO_ROTATE_RESUME_MS = 5000;
const AUTO_ROTATE_SPEED = 0.55;

/**
 * Interactive PUK GLB viewer. Reusable; driven by parent simulator state.
 * Renders only while `active` is true (no RAF loop when hidden).
 */
export default function PukModelViewer({
  active = true,
  screenMedia = null, // { type: 'video'|'image'|'color', src?, color? }
  onScreenActivate,
}) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const screenMediaRef = useRef(screenMedia);
  const onScreenActivateRef = useRef(onScreenActivate);
  screenMediaRef.current = screenMedia;
  onScreenActivateRef.current = onScreenActivate;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    let raf = 0;
    let resumeTimer = null;
    let screenVideoEl = null;
    let screenTexture = null;
    let screenCanvas = null;
    let screenCanvasCtx = null;
    let screenCanvasPaint = null;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9e9ea6);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
    camera.position.set(0.55, 0.32, 0.95);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 0.28;
    controls.maxDistance = 3.2;
    controls.autoRotate = false;
    controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
    controls.target.set(0, 0, 0);
    // Hold the opening three-quarter view briefly before auto-rotate
    const autoRotateKickoff = setTimeout(() => {
      if (!disposed && apiRef.current?.active) controls.autoRotate = true;
    }, 2800);

    scene.add(new THREE.AmbientLight(0xffffff, 0.32));
    const hemi = new THREE.HemisphereLight(0xf2f2f5, 0x0c0c10, 0.7);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(2.4, 3.8, 2.6);
    scene.add(key);
    // Neutral fill — cool blue push made black plastics read purply grey
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-2.8, 1.4, -1.2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xfff0dd, 0.35);
    rim.position.set(0.1, 2.0, -2.8);
    scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);

    let screenMesh = null; // display surface (dedicated plane; not raw GLB glass)
    let screenGlass = null; // original pukscreen from the GLB
    let modelLoaded = false;
    let contactShadow = null;
    let screenGlow = null; // soft light spill stacked along screen normal
    let glowSampleCanvas = null;
    let glowSampleCtx = null;
    const glowAvg = { r: 0.55, g: 0.55, b: 0.6, sampleEvery: 0 };

    function createContactShadow() {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size * 0.48);
      g.addColorStop(0, 'rgba(0,0,0,0.55)');
      g.addColorStop(0.45, 'rgba(0,0,0,0.22)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = -1;
      mesh.name = 'puk-contact-shadow';
      scene.add(mesh);
      return mesh;
    }

    function placeContactShadow(object) {
      if (!contactShadow) contactShadow = createContactShadow();
      object.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const spanX = Math.max(size.x, 0.05);
      const spanZ = Math.max(size.z, 0.05);
      // Soft oval under the footprint, slightly larger than the base
      contactShadow.scale.set(spanX * 1.55, spanZ * 1.35, 1);
      contactShadow.position.set(center.x, box.min.y - 0.18, center.z);
      contactShadow.visible = true;
    }

    /** Soft halo map — energy sits around the rim so video stays clean. */
    function createGlowMap() {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      // Soft ring: quiet center, mild mid, fade to nothing — reads as spill, not a flash sheet
      const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size * 0.5);
      g.addColorStop(0, 'rgba(255,255,255,0.08)');
      g.addColorStop(0.28, 'rgba(255,255,255,0.42)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.16)');
      g.addColorStop(0.82, 'rgba(255,255,255,0.03)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return map;
    }

    /**
     * Very subtle light shooting outward from the screen face —
     * stacked soft additive cards along the normal so a turn shows spill into space.
     */
    function installScreenGlow(plane) {
      if (!plane || plane.userData.pukScreenGlow) return plane?.userData?.pukScreenGlow || null;

      const map = createGlowMap();
      const group = new THREE.Group();
      group.name = 'puk-screen-glow';

      // Closer / tighter → farther / softer. Local +Z is the screen outward normal.
      const layers = [
        { z: 0.018, sx: 1.28, sy: 1.22, opacity: 0.11 },
        { z: 0.055, sx: 1.65, sy: 1.5, opacity: 0.06 },
        { z: 0.13, sx: 2.15, sy: 1.95, opacity: 0.028 },
      ];

      layers.forEach((layer, i) => {
        const mat = new THREE.MeshBasicMaterial({
          map,
          color: 0xffffff,
          transparent: true,
          opacity: layer.opacity,
          depthWrite: false,
          depthTest: true,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          toneMapped: false,
        });
        const card = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        card.name = `puk-screen-glow-${i}`;
        card.position.z = layer.z;
        card.scale.set(layer.sx, layer.sy, 1);
        card.renderOrder = 2 + i;
        card.frustumCulled = false;
        group.add(card);
      });

      plane.add(group);
      plane.userData.pukScreenGlow = group;
      screenGlow = group;
      return group;
    }

    /** Tint / pulse glow from a tiny downsample of the screen canvas. */
    function updateScreenGlowFromCanvas() {
      if (!screenGlow || !screenCanvas) return;
      glowAvg.sampleEvery = (glowAvg.sampleEvery + 1) % 4;
      if (glowAvg.sampleEvery !== 0) {
        applyGlowTint();
        return;
      }
      if (!glowSampleCanvas) {
        glowSampleCanvas = document.createElement('canvas');
        glowSampleCanvas.width = 8;
        glowSampleCanvas.height = 8;
        glowSampleCtx = glowSampleCanvas.getContext('2d', { willReadFrequently: true });
      }
      if (!glowSampleCtx) return;
      try {
        glowSampleCtx.drawImage(screenCanvas, 0, 0, 8, 8);
        const data = glowSampleCtx.getImageData(0, 0, 8, 8).data;
        let r = 0;
        let g = 0;
        let b = 0;
        const n = 64;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        // Ease toward content color so flashes feel alive without strobing hard
        glowAvg.r += ((r / n) / 255 - glowAvg.r) * 0.22;
        glowAvg.g += ((g / n) / 255 - glowAvg.g) * 0.22;
        glowAvg.b += ((b / n) / 255 - glowAvg.b) * 0.22;
      } catch {
        /* tainted canvas — keep last tint */
      }
      applyGlowTint();
    }

    function applyGlowTint() {
      if (!screenGlow) return;
      const lum = 0.2126 * glowAvg.r + 0.7152 * glowAvg.g + 0.0722 * glowAvg.b;
      const boost = 0.55 + lum * 0.9; // dim content → quieter spill
      const baseOp = [0.11, 0.06, 0.028];
      screenGlow.children.forEach((card, i) => {
        const mat = card.material;
        if (!mat) return;
        mat.color.setRGB(
          Math.min(1, glowAvg.r * 1.15 + 0.08),
          Math.min(1, glowAvg.g * 1.15 + 0.08),
          Math.min(1, glowAvg.b * 1.15 + 0.1),
        );
        mat.opacity = (baseOp[i] ?? 0.04) * boost;
      });
    }

    function screenFaceNormal(mesh) {
      mesh.updateMatrixWorld(true);
      const geom = mesh.geometry;
      if (geom?.attributes?.normal) {
        const n = geom.attributes.normal;
        const acc = new THREE.Vector3();
        const count = Math.min(48, n.count);
        for (let i = 0; i < count; i += 1) {
          acc.x += n.getX(i);
          acc.y += n.getY(i);
          acc.z += n.getZ(i);
        }
        if (acc.lengthSq() > 1e-8) {
          return acc.normalize().transformDirection(mesh.matrixWorld).normalize();
        }
      }
      return new THREE.Vector3(0, 0, 1);
    }

    function screenFacingScore(screen, cameraPos) {
      const box = new THREE.Box3().setFromObject(screen);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const face = screenFaceNormal(screen);
      const toCam = cameraPos.clone().sub(center).normalize();
      // pukscreen normals point into the chassis; prefer the opposite side toward the camera
      const facing = -face.dot(toCam);
      // Prefer orientations where the screen is a large portrait rectangle in world space
      const portrait = size.y >= size.x ? 1 : 0.25;
      const area = size.x * size.y;
      return facing * 5 + portrait + area;
    }

    function chooseBestOrientation(object, screen) {
      if (!screen) return;
      const probe = new THREE.Vector3(0.55, 0.2, 1.2);
      let best = { score: -Infinity, yaw: 0, roll: 0 };

      for (let yi = 0; yi < 4; yi += 1) {
        for (let ri = 0; ri < 4; ri += 1) {
          object.rotation.set(0, (yi * Math.PI) / 2, (ri * Math.PI) / 2);
          object.updateMatrixWorld(true);
          const score = screenFacingScore(screen, probe);
          if (score > best.score) {
            best = { score, yaw: yi, roll: ri };
          }
        }
      }

      object.rotation.set(0, (best.yaw * Math.PI) / 2, (best.roll * Math.PI) / 2);
      object.updateMatrixWorld(true);
    }

    function fitModel(object, screen) {
      object.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      object.scale.setScalar(1.0 / maxDim);
      object.rotation.set(0, 0, 0);
      object.updateMatrixWorld(true);

      chooseBestOrientation(object, screen);

      // Square to camera — no baked yaw/pitch so it floats face-on and can be straightened
      object.updateMatrixWorld(true);

      const mid = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
      object.position.sub(mid);
      object.updateMatrixWorld(true);

      const framed = new THREE.Box3().setFromObject(object);
      const fSize = framed.getSize(new THREE.Vector3());
      const fCenter = framed.getCenter(new THREE.Vector3());
      controls.target.copy(fCenter);
      const dist = Math.max(fSize.x, fSize.y, fSize.z) * 2.05;
      // Dead-ahead camera (no X lean)
      camera.position.set(
        fCenter.x,
        fCenter.y + dist * 0.02,
        fCenter.z + dist * 1.2,
      );
      controls.minDistance = dist * 0.4;
      controls.maxDistance = dist * 3.4;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;
      controls.update();
      placeContactShadow(object);
    }

    function polishEnclosureMaterials(object, screen) {
      object.traverse((obj) => {
        if (!obj.isMesh || obj === screen) return;
        const name = (obj.name || '').toLowerCase();
        const isSurround = name === 'cube' || name.includes('surround') || name.includes('bezel');
        const mats = [].concat(obj.material || []);
        const next = mats.map((m) => {
          if (!m || !m.color) return m;
          if (isSurround) {
            // Front bezel — deep glossy black (clearcoat picks up key/rim lights)
            const gloss = new THREE.MeshPhysicalMaterial({
              color: new THREE.Color(0.008, 0.008, 0.01),
              roughness: 0.18,
              metalness: 0.04,
              clearcoat: 1,
              clearcoatRoughness: 0.06,
              envMapIntensity: 0.3,
            });
            m.dispose?.();
            return gloss;
          }
          // Body — matte charcoal (export materials were white/metal)
          m.color.setRGB(0.028, 0.028, 0.03);
          if ('roughness' in m) m.roughness = 0.85;
          if ('metalness' in m) m.metalness = 0.02;
          if ('envMapIntensity' in m) m.envMapIntensity = 0;
          m.needsUpdate = true;
          return m;
        });
        obj.material = Array.isArray(obj.material) ? next : next[0];
      });
    }

    function clearScreenMedia() {
      screenCanvasPaint = null;
      screenCanvas = null;
      screenCanvasCtx = null;
      if (screenTexture) {
        screenTexture.dispose();
        screenTexture = null;
      }
      if (screenVideoEl) {
        try {
          screenVideoEl.pause();
          screenVideoEl.removeAttribute('src');
          screenVideoEl.load();
          screenVideoEl.remove();
        } catch { /* ignore */ }
        screenVideoEl = null;
      }
    }

    /**
     * GLB pukscreen is an XZ plane (normal +Y) with atlas UVs — unreliable for video.
     * Parent a PlaneGeometry with known portrait UVs: width along Z, height along X.
     */
    function installScreenPlane(glass) {
      if (!glass?.geometry) return null;
      if (glass.userData.pukScreenPlane) return glass.userData.pukScreenPlane;

      glass.geometry.computeBoundingBox();
      const bb = glass.geometry.boundingBox;
      const xSpan = Math.max(1e-6, bb.max.x - bb.min.x);
      const zSpan = Math.max(1e-6, bb.max.z - bb.min.z);
      const yMid = (bb.min.y + bb.max.y) / 2;

      // Active LCD area — true 320:480 aspect, inset inside glass so surround rim shows
      const lcdAspect = 320 / 480;
      const inset = 0.978;
      let planeH = xSpan * inset;
      let planeW = planeH * lcdAspect;
      if (planeW > zSpan * inset) {
        planeW = zSpan * inset;
        planeH = planeW / lcdAspect;
      }
      const geom = new THREE.PlaneGeometry(planeW, planeH);
      geom.userData.pukScreenAspect = lcdAspect;

      const plane = new THREE.Mesh(
        geom,
        new THREE.MeshBasicMaterial({ color: 0x050505, toneMapped: false, side: THREE.DoubleSide }),
      );
      plane.name = 'pukscreen-plane';
      // U→+Z, V→+X. With hole-at-bottom (+X world-down), flipY=false keeps video upright.
      const basis = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 1, 0),
      );
      plane.quaternion.setFromRotationMatrix(basis);
      plane.position.set(
        (bb.min.x + bb.max.x) / 2,
        yMid + Math.max(xSpan, zSpan) * 0.002,
        (bb.min.z + bb.max.z) / 2,
      );
      glass.add(plane);

      // Hide original glass mesh without hiding the child plane
      const prev = glass.material;
      glass.material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      if (prev) {
        [].concat(prev).forEach((m) => {
          if (m?.map) m.map.dispose();
          m?.dispose?.();
        });
      }

      glass.userData.pukScreenPlane = plane;
      installScreenGlow(plane);
      return plane;
    }

    /** Cover-fit portrait media onto the screen plane UVs (mirrored to match device facing). */
    function configureScreenMap(map) {
      map.colorSpace = THREE.SRGBColorSpace;
      map.flipY = false;
      // Negative X repeat needs RepeatWrapping; Clamp would break the mirror
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.ClampToEdgeWrapping;
      map.center.set(0, 0);
      map.rotation = 0;
      map.repeat.set(-1, 1);
      map.offset.set(1, 0);
      map.needsUpdate = true;
    }

    function applyScreenMaterial(map, color = 0x000000, contentSize = null) {
      if (!screenMesh) return;
      const prev = screenMesh.material;
      const mat = new THREE.MeshBasicMaterial({
        map: map || null,
        color: map ? 0xffffff : color,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      if (map) {
        configureScreenMap(map);
      }
      screenMesh.material = mat;
      screenMesh.material.needsUpdate = true;
      if (prev && prev !== mat) {
        if (prev.map && prev.map !== map) prev.map.dispose();
        prev.dispose();
      }
    }

    function setScreenMedia(media) {
      clearScreenMedia();
      if (!screenMesh) return;

      if (!media || media.type === 'color') {
        applyScreenMaterial(null, media?.color ?? 0x050505);
        return;
      }

      if (media.type === 'image' && media.src) {
        const loader = new THREE.TextureLoader();
        loader.load(
          media.src,
          (tex) => {
            if (disposed) {
              tex.dispose();
              return;
            }
            screenTexture = tex;
            const img = tex.image;
            applyScreenMaterial(tex, 0xffffff, {
              width: img?.naturalWidth || img?.width,
              height: img?.naturalHeight || img?.height,
            });
          },
          undefined,
          () => applyScreenMaterial(null, 0x111111),
        );
        return;
      }

      if (media.type === 'canvas' && media.canvas) {
        const tex = new THREE.CanvasTexture(media.canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.needsUpdate = true;
        screenTexture = tex;
        // Live LCD composites (QR + timer) — refresh every frame from the shared canvas
        if (media.live) {
          screenCanvas = media.canvas;
          screenCanvasPaint = () => {
            tex.needsUpdate = true;
          };
        }
        applyScreenMaterial(tex, 0xffffff, {
          width: media.canvas.width,
          height: media.canvas.height,
        });
        return;
      }

      if (media.type === 'video' && media.src) {
        const video = document.createElement('video');
        video.src = media.src;
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.preload = 'auto';
        // Keep in DOM (hidden) — improves autoplay reliability across browsers
        video.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:0;top:0';
        mount.appendChild(video);
        screenVideoEl = video;

        // Blit through canvas; size matches pukscreen aspect so we don't crop the promo
        const canvas = document.createElement('canvas');
        const screenAspect = screenMesh?.geometry?.userData?.pukScreenAspect || (52 / 80);
        canvas.height = 640;
        canvas.width = Math.max(2, Math.round(canvas.height * screenAspect));
        const ctx = canvas.getContext('2d', { alpha: false });
        screenCanvas = canvas;
        screenCanvasCtx = ctx;

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        screenTexture = tex;
        applyScreenMaterial(tex, 0xffffff, { width: canvas.width, height: canvas.height });

        const paint = () => {
          if (!screenCanvasCtx || !screenVideoEl) return;
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (vw < 2 || vh < 2) return;
          const cw = canvas.width;
          const ch = canvas.height;
          // Cover the plane — avoids thin letterbox lines at top/bottom
          const scale = Math.max(cw / vw, ch / vh);
          const dw = vw * scale;
          const dh = vh * scale;
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, cw, ch);
          // Horizontal mirror is applied on the texture UVs (shared with image/QR)
          ctx.drawImage(video, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
          tex.needsUpdate = true;
        };
        screenCanvasPaint = paint;

        const tryPlay = () => {
          paint();
          const p = video.play();
          if (p && typeof p.catch === 'function') {
            p.catch((err) => console.warn('[PukModelViewer] video play blocked', err?.message || err));
          }
        };
        video.addEventListener('loadeddata', tryPlay);
        video.addEventListener('canplay', tryPlay, { once: true });
        tryPlay();
      }
    }

    function resize() {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    function pauseAutoRotateTemporarily() {
      controls.autoRotate = false;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        if (!disposed && apiRef.current?.active) controls.autoRotate = true;
      }, AUTO_ROTATE_RESUME_MS);
    }

    controls.addEventListener('start', pauseAutoRotateTemporarily);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = null;

    function ndcFromEvent(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX;
      const clientY = e.clientY ?? e.changedTouches?.[0]?.clientY;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }

    function hitScreen(e) {
      if (!screenMesh) return false;
      ndcFromEvent(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(screenMesh, true);
      return hits.length > 0;
    }

    function onPointerDown(e) {
      pointerDown = {
        x: e.clientX ?? e.touches?.[0]?.clientX,
        y: e.clientY ?? e.touches?.[0]?.clientY,
        t: Date.now(),
        onScreen: hitScreen(e),
      };
    }

    function onPointerUp(e) {
      if (!pointerDown) return;
      const x = e.clientX ?? e.changedTouches?.[0]?.clientX;
      const y = e.clientY ?? e.changedTouches?.[0]?.clientY;
      const dx = Math.abs(x - pointerDown.x);
      const dy = Math.abs(y - pointerDown.y);
      const dt = Date.now() - pointerDown.t;
      const wasOnScreen = pointerDown.onScreen;
      pointerDown = null;
      if (!wasOnScreen || dx > 10 || dy > 10 || dt > 500) return;
      if (hitScreen(e) && typeof onScreenActivateRef.current === 'function') {
        onScreenActivateRef.current();
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        model.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = false;
            obj.receiveShadow = false;
            if (obj.name === SCREEN_NAME || obj.name.toLowerCase() === SCREEN_NAME) {
              screenGlass = obj;
            }
          }
        });
        if (!screenGlass) {
          screenGlass = model.getObjectByName(SCREEN_NAME)
            || model.getObjectByName('Cube.003')
            || null;
        }
        polishEnclosureMaterials(model, screenGlass);
        root.add(model);
        fitModel(root, screenGlass);
        screenMesh = screenGlass ? installScreenPlane(screenGlass) : null;
        modelLoaded = true;
        setScreenMedia(screenMediaRef.current);
        resize();
        // Force one paint after layout
        renderer.render(scene, camera);
      },
      undefined,
      (err) => {
        console.error('[PukModelViewer] GLB load failed', err);
      },
    );

    function tick() {
      if (disposed) return;
      if (apiRef.current?.active) {
        controls.update();
        if (typeof screenCanvasPaint === 'function') {
          screenCanvasPaint();
          updateScreenGlowFromCanvas();
        } else if (screenTexture && screenTexture.isVideoTexture) {
          screenTexture.needsUpdate = true;
        }
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      }
    }

    function startLoop() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }

    function stopLoop() {
      cancelAnimationFrame(raf);
      raf = 0;
      controls.autoRotate = false;
      if (screenVideoEl) {
        try { screenVideoEl.pause(); } catch { /* ignore */ }
      }
    }

    const ro = new ResizeObserver(() => resize());
    ro.observe(mount);
    resize();

    apiRef.current = {
      active: false,
      setActive(next) {
        this.active = next;
        if (next) {
          controls.autoRotate = true;
          if (screenVideoEl) {
            const p = screenVideoEl.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          }
          startLoop();
        } else {
          stopLoop();
        }
      },
      setScreenMedia,
      get modelLoaded() { return modelLoaded; },
    };

    if (active) apiRef.current.setActive(true);

    return () => {
      disposed = true;
      clearTimeout(resumeTimer);
      clearTimeout(autoRotateKickoff);
      stopLoop();
      ro.disconnect();
      controls.removeEventListener('start', pauseAutoRotateTemporarily);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      clearScreenMedia();
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          const mats = [].concat(obj.material || []);
          mats.forEach((m) => {
            if (!m) return;
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    apiRef.current?.setActive(Boolean(active));
  }, [active]);

  useEffect(() => {
    apiRef.current?.setScreenMedia(screenMedia);
  }, [screenMedia]);

  return (
    <div className="puk3d-viewer" ref={mountRef} aria-label="PUK 3D model viewer" />
  );
}
