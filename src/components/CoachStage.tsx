"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import type { CoachModel } from "@/lib/coachModels";
import { cn } from "@/lib/utils";

// Studio stage for an animated coach GLB: warm key light with soft shadows,
// cool fill, gold rim — framed for the 3:4 god cards. Mounts above the static
// portrait and fades in once the model is ready; the portrait stays as the
// loading poster and the fallback when WebGL is unavailable.

const CHAR_HEIGHT = 1.72; // normalized god height in stage units
const PEDESTAL_TOP = 0.34; // stepped plinth height — the god stands here, not the floor
const MARBLE = 0xf0eadd; // the ivory the gods are carved from
const DOME = 0xe0d5b6; // backdrop — deeper than the card ivory so the marble separates
const FLOOR = 0xf3ecd9; // --pressed
const KEY_WARM = 0xfff1da;
const FILL_COOL = 0xdfe8ff;
const GOLD_GLEAM = 0xd3b25e; // --gold-gleam
const RIM_BASE = 230;
const RIM_CHOSEN = 400;
const RING_CHOSEN = 0.5;

// Mixamo clips bake travel into the hips (hermes_run covers ~1.7m per cycle).
// Remove the one-way drift per axis so the god stays on the pedestal while
// keeping the in-cycle bob and sway.
function stripRootTravel(clip: THREE.AnimationClip) {
  for (const track of clip.tracks) {
    if (!track.name.endsWith(".position") || !/hips/i.test(track.name)) continue;
    const { times, values } = track;
    const n = times.length;
    if (n < 2) continue;
    const t0 = times[0];
    const span = times[n - 1] - t0 || 1;
    for (let axis = 0; axis < 3; axis++) {
      const drift = values[(n - 1) * 3 + axis] - values[axis];
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < n; i++) {
        const v = values[i * 3 + axis];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const range = max - min;
      if (range > 1e-6 && Math.abs(drift) / range > 0.6) {
        for (let i = 0; i < n; i++) {
          values[i * 3 + axis] -= drift * ((times[i] - t0) / span);
        }
      }
    }
  }
}

// Skinned-mesh geometry bounds ignore the pose, so measure the skeleton itself.
function boneBounds(root: THREE.Object3D) {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) box.expandByPoint(o.getWorldPosition(v));
  });
  if (box.isEmpty()) box.setFromObject(root);
  return box;
}

export default function CoachStage({
  model,
  selected = false,
  className,
}: {
  model: CoachModel;
  selected?: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const selectedRef = useRef(selected);
  const repaintRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    selectedRef.current = selected;
    repaintRef.current?.(); // keep the static frame honest for reduced-motion users
  }, [selected]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // metered/slow connections keep the static poster — never pull the GLBs
    const conn = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? "")) {
      setFailed(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 3 / 4, 0.1, 40);
    camera.position.set(0, 1.2, 4.7);
    camera.lookAt(0, 1.04, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    const envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.3;
    envScene.dispose();
    pmrem.dispose();

    // three-point studio rig — high key:fill ratio so the marble keeps its form
    const key = new THREE.SpotLight(KEY_WARM, 340, 0, 0.5, 0.9, 2);
    key.position.set(2.3, 3.6, 2.8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 12;
    key.shadow.bias = -0.00015;
    key.shadow.normalBias = 0.015;
    key.target.position.set(0, 1.05, 0);
    scene.add(key, key.target);

    const fill = new THREE.DirectionalLight(FILL_COOL, 0.42);
    fill.position.set(-3.2, 1.8, 2.6);
    scene.add(fill);

    const rimGold = new THREE.SpotLight(GOLD_GLEAM, RIM_BASE, 0, 0.7, 1, 2);
    rimGold.position.set(-2.6, 3.2, -2.4);
    rimGold.target.position.set(0, 1.3, 0);
    scene.add(rimGold, rimGold.target);

    const rimWhite = new THREE.SpotLight(0xfff8ea, 120, 0, 0.62, 1, 2);
    rimWhite.position.set(2.8, 2.6, -2.2);
    rimWhite.target.position.set(0, 1.4, 0);
    scene.add(rimWhite, rimWhite.target);

    scene.add(new THREE.HemisphereLight(0xfff6e6, 0xb8a276, 0.28));

    // infinity backdrop: dome interior + floor disc meeting at the horizon
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(9, 48, 32),
      new THREE.MeshStandardMaterial({ color: DOME, roughness: 1, metalness: 0, side: THREE.BackSide })
    );
    scene.add(dome);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 48).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: FLOOR, roughness: 0.96, metalness: 0 })
    );
    floor.receiveShadow = true;
    scene.add(floor);

    // stepped marble plinth with a gold trim band — the god's pedestal
    const plinthMat = new THREE.MeshStandardMaterial({ color: MARBLE, roughness: 0.55, metalness: 0 });
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.16, 56), plinthMat);
    drum.position.y = PEDESTAL_TOP - 0.08;
    const trim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.04, 56),
      new THREE.MeshStandardMaterial({ color: GOLD_GLEAM, roughness: 0.3, metalness: 0.85 })
    );
    trim.position.y = 0.16;
    const plinthBase = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.84, 0.14, 56), plinthMat);
    plinthBase.position.y = 0.07;
    for (const step of [drum, trim, plinthBase]) {
      step.castShadow = true;
      step.receiveShadow = true;
      scene.add(step);
    }

    const ringMat = new THREE.MeshBasicMaterial({ color: GOLD_GLEAM, transparent: true, opacity: 0 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.585, 64).rotateX(-Math.PI / 2), ringMat);
    ring.position.y = PEDESTAL_TOP + 0.004;
    scene.add(ring);

    let disposed = false;
    let loaded = false;
    let visible = true;
    let loopOn = false;
    let mixer: THREE.AnimationMixer | null = null;
    let freezeAt = 0;
    const timer = new THREE.Timer();
    const rmq = window.matchMedia("(prefers-reduced-motion: reduce)");

    // mixer.setTime scales its input by mixer.timeScale (and action timeScale)
    // in three 0.185 — divide so callers can pass real clip time
    const setClipTime = (t: number) => {
      if (mixer) mixer.setTime(t / (mixer.timeScale || 1));
    };

    const applyChosenLook = (snap: boolean, dt = 0) => {
      const k = snap ? 1 : Math.min(1, dt * 7);
      const rim = selectedRef.current ? RIM_CHOSEN : RIM_BASE;
      const ringOpacity = selectedRef.current ? RING_CHOSEN : 0;
      rimGold.intensity += (rim - rimGold.intensity) * k;
      ringMat.opacity += (ringOpacity - ringMat.opacity) * k;
    };

    const tick = () => {
      timer.update();
      const dt = Math.min(timer.getDelta(), 0.05);
      mixer?.update(dt);
      applyChosenLook(false, dt);
      renderer.render(scene, camera);
    };

    const renderOnce = () => {
      if (disposed || !loaded) return;
      applyChosenLook(true);
      renderer.render(scene, camera);
    };
    repaintRef.current = () => {
      if (!loopOn) renderOnce();
    };

    const syncLoop = () => {
      const want = loaded && visible && !rmq.matches && !disposed;
      if (want === loopOn) return;
      loopOn = want;
      if (want) {
        timer.update(); // drop time spent paused so the clip doesn't jump
        renderer.setAnimationLoop(tick);
      } else {
        renderer.setAnimationLoop(null);
      }
    };

    const onMotionPref = () => {
      if (rmq.matches && mixer) {
        setClipTime(freezeAt);
        syncLoop();
        renderOnce();
      } else {
        syncLoop();
      }
    };
    rmq.addEventListener("change", onMotionPref);

    // Deferred: the GLBs are heavy, so fetch only once the card nears the
    // viewport, and let cleanup abort an in-flight download.
    const manager = new THREE.LoadingManager();
    let loadStarted = false;
    const startLoad = () => {
      if (loadStarted || disposed) return;
      loadStarted = true;
      const loader = new GLTFLoader(manager);
      loader.setMeshoptDecoder(MeshoptDecoder);
      loader.load(
      model.src,
      (gltf) => {
        if (disposed) return;
        const rig = gltf.scene;
        // The exports' baked textures are riddled with crack veins and baked
        // crevice shading; when hips/shoulders fold mid-clip those dark texels
        // smear across the surface and read as the mesh tearing open. The gods
        // wear clean ivory marble instead — the GLBs ship textureless
        // (scripts/optimize-models.mjs) and this override is the whole look.
        const marble = new THREE.MeshStandardMaterial({ color: MARBLE, roughness: 0.45, metalness: 0 });
        rig.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false; // skinned bounds lag the pose
          const prev = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mesh.material = marble;
          for (const mat of prev) {
            if (!mat) continue;
            for (const value of Object.values(mat)) {
              if (value && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
            }
            mat.dispose();
          }
        });

        const pivot = new THREE.Group();
        pivot.add(rig);
        scene.add(pivot);

        const clips = gltf.animations ?? [];
        const clip =
          (model.clip != null ? clips[model.clip] : undefined) ??
          clips.reduce<THREE.AnimationClip | undefined>(
            (best, c) => (best && best.duration >= c.duration ? best : c),
            undefined
          );

        if (clip) {
          stripRootTravel(clip);
          mixer = new THREE.AnimationMixer(rig);
          mixer.timeScale = model.timeScale ?? 1;
          mixer.clipAction(clip).play();
          freezeAt = clip.duration * (model.poseAt ?? 0.35);
        }

        // Fit the whole cycle, not one frame: the bind pose is degenerate in
        // these exports and clips crouch/stand, so union the skeleton bounds
        // across the clip, then scale so the tallest pose is CHAR_HEIGHT and
        // the cycle's lowest point rests on the floor.
        const box = new THREE.Box3();
        if (mixer && clip) {
          const samples = 16;
          for (let i = 0; i <= samples; i++) {
            setClipTime((clip.duration * i) / samples);
            box.union(boneBounds(rig));
          }
          setClipTime(0);
        } else {
          box.copy(boneBounds(rig));
        }
        const height = Math.max(box.getSize(new THREE.Vector3()).y, 1e-3);
        const s = CHAR_HEIGHT / height;
        rig.scale.multiplyScalar(s);
        const center = box.getCenter(new THREE.Vector3()).multiplyScalar(s);
        rig.position.set(-center.x, -box.min.y * s + PEDESTAL_TOP + 0.005, -center.z);
        pivot.rotation.y = model.yaw ?? 0;

        loaded = true;
        if (rmq.matches && mixer) setClipTime(freezeAt);
        setReady(true);
        syncLoop();
        renderOnce();
      },
      undefined,
      (err) => {
        if (disposed) return; // aborted by cleanup
        console.warn(`CoachStage: failed to load ${model.src}`, err);
        setFailed(true);
      }
      );
    };

    const ro = new ResizeObserver(() => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!loopOn) renderOnce();
    });
    ro.observe(host);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) startLoad();
        syncLoop();
      },
      { rootMargin: "200px" }
    );
    io.observe(host);

    return () => {
      disposed = true;
      repaintRef.current = null;
      manager.abort();
      rmq.removeEventListener("change", onMotionPref);
      ro.disconnect();
      io.disconnect();
      renderer.setAnimationLoop(null);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        (mesh as unknown as THREE.SkinnedMesh).skeleton?.dispose();
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          if (!mat) continue;
          for (const value of Object.values(mat)) {
            if (value && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
          }
          mat.dispose();
        }
      });
      envRT.dispose();
      key.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [model]);

  if (failed) return null;
  // aria-hidden: the stage restates the poster image + visible caption, so it
  // must not add to the card button's accessible name
  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      data-coach-stage={ready ? "ready" : "loading"}
      className={cn(
        "pointer-events-none absolute inset-0 transition-opacity duration-700",
        ready ? "opacity-100" : "opacity-0",
        className
      )}
    />
  );
}
