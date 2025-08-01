import { createFileSystem } from './createFileSystem';
import { Environment } from './types';

export function createNodejsEnv(): Environment {

  const Canvas = (global as any)['Canvas'] || (global as any)['HTMLCanvasElement']
  const Image = (global as any)['Image'] || (global as any)['HTMLImageElement']

  const createCanvasElement = function() {
    if (Canvas) {
      return new Canvas()
    }
    throw new Error('createCanvasElement - missing Canvas implementation for nodejs environment')
  }

  const createImageElement = function() {
    if (Image) {
      return new Image()
    }
    throw new Error('createImageElement - missing Image implementation for nodejs environment')
  }

  const fetch = (global as any)['fetch'] || function() {
    throw new Error('fetch - missing fetch implementation for nodejs environment')
  }

  const fileSystem = createFileSystem()

  return {
    Canvas: Canvas || class {},
    CanvasRenderingContext2D: (global as any)['CanvasRenderingContext2D'] || class {},
    Image: Image || class {},
    ImageData: (global as any)['ImageData'] || class {},
    Video: (global as any)['HTMLVideoElement'] || class {},
    createCanvasElement,
    createImageElement,
    fetch,
    ...fileSystem
  }
}