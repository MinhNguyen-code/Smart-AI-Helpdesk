import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function SupportScene() {
  const host = useRef(null);
  useEffect(() => {
    const element = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { element.textContent = 'Bàn hỗ trợ CNTT · Luôn sẵn sàng'; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
    camera.position.set(5, 3.4, 7);
    camera.lookAt(0, .8, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x667080, 3));
    const light = new THREE.DirectionalLight(0xffffff, 4);
    light.position.set(3, 5, 4); scene.add(light);
    const group = new THREE.Group(); scene.add(group);
    const materials = [];
    function box(w, h, d, color, x, y, z) {
      const material = new THREE.MeshStandardMaterial({ color, roughness: .75 });
      materials.push(material);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z); group.add(mesh); return mesh;
    }
    box(4.4, .14, 2, 0xd5d8df, 0, .25, 0);
    box(.12, 1.25, .12, 0xb0b7c2, -1.8, -.4, .65);
    box(.12, 1.25, .12, 0xb0b7c2, 1.8, -.4, .65);
    box(2.4, 1.5, .15, 0x4a5565, 0, 1.55, -.35);
    box(2.15, 1.25, .04, 0xe7ecf3, 0, 1.55, -.25);
    box(.16, .45, .16, 0x6b7686, 0, .65, -.35);
    box(.8, .08, .5, 0x6b7686, 0, .35, -.35);
    box(1.6, .07, .5, 0xf7f8fa, 0, .36, .5);
    box(.38, .48, .38, 0x94a3b8, 1.5, .56, -.15);
    for (let i = 0; i < 3; i++) box(.12, .5 + i * .1, .12, 0x647d70, 1.4 + i * .1, .95, -.15);
    box(1.2, .08, .08, 0x8fa8cb, -.2, 1.8, -.2);
    box(.8, .06, .08, 0xc1cbd9, -.4, 1.5, -.2);
    box(1.4, .06, .08, 0xc1cbd9, -.1, 1.25, -.2);
    const resize = () => { const { width, height } = element.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.render(scene, camera); };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const move = event => { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; group.rotation.y = (event.offsetX / element.clientWidth - .5) * .18; renderer.render(scene, camera); };
    element.addEventListener('pointermove', move);
    return () => { observer.disconnect(); element.removeEventListener('pointermove', move); group.children.forEach(mesh => mesh.geometry.dispose()); materials.forEach(material => material.dispose()); renderer.dispose(); renderer.domElement.remove(); };
  }, []);
  return <div className="support-scene" ref={host} role="img" aria-label="Minh họa 3D bàn hỗ trợ với máy tính và chậu cây" />;
}
