import * as tf from '@tensorflow/tfjs-core';

import { fetchImage, fetchJson, fetchNetWeights, NeuralNetwork } from '../src';
import { TestEnv } from './Environment';

// Set timeout for Jest
jest.setTimeout(60000)

// Set up TensorFlow.js backend for browser tests
if (typeof window !== 'undefined') {
  // Try to set CPU backend, fallback to default if not available
  try {
    tf.setBackend('cpu')
  } catch (error) {
    console.warn('CPU backend not available, using default backend')
  }
}

async function loadImageBrowser(uri: string): Promise<HTMLImageElement> {
  // Fix URL resolution for Jest environment
  const baseUrl = process.env.NODE_ENV === 'test' ? 'http://localhost:3000' : ''
  const fullUri = uri.startsWith('http') ? uri : `${baseUrl}${uri.startsWith('/') ? '' : '/'}${uri}`
  return fetchImage(fullUri)
}

async function loadJsonBrowser<T>(uri: string): Promise<T> {
  // Fix URL resolution for Jest environment
  const baseUrl = process.env.NODE_ENV === 'test' ? 'http://localhost:3000' : ''
  const fullUri = uri.startsWith('http') ? uri : `${baseUrl}${uri.startsWith('/') ? '' : '/'}${uri}`
  return fetchJson<T>(fullUri)
}

async function initNetBrowser<TNet extends NeuralNetwork<any>>(
  net: TNet,
  uncompressedFilename: string | boolean,
  isUnusedModel: boolean = false
) {
  const baseUrl = process.env.NODE_ENV === 'test' ? 'http://localhost:3000' : ''
  const url = uncompressedFilename
    ? await fetchNetWeights(`${baseUrl}/weights_uncompressed/${uncompressedFilename}`)
    : (isUnusedModel ? `${baseUrl}/weights_unused` : `${baseUrl}/weights`)
  await net.load(url)
}

const browserTestEnv: TestEnv = {
  loadImage: loadImageBrowser,
  loadJson: loadJsonBrowser,
  initNet: initNetBrowser
}

// Declare global type for TypeScript
declare const global: any;

export function getTestEnv(): TestEnv {
  return global['nodeTestEnv'] || browserTestEnv;
}

