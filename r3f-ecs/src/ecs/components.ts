import * as THREE from 'three';
import { defineComponent } from './core';

export type Vector3Tuple = [number, number, number];

export interface TransformData {
  position: Vector3Tuple;
  rotation: Vector3Tuple; // Euler in radians
  scale: Vector3Tuple;
}

export interface SpinData {
  speed: Vector3Tuple; // radians per second
}

export interface Object3DRefData {
  object: THREE.Object3D | null;
}

export const Transform = defineComponent<TransformData>('Transform');
export const Spin = defineComponent<SpinData>('Spin');
export const Object3DRef = defineComponent<Object3DRefData>('Object3DRef');