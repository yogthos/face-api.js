const dataFiles = [
  'test/images/*.jpg',
  'test/images/*.png',
  'test/data/*.json',
  'test/data/*.weights',
  'test/media/*.mp4',
  'weights/**/*',
  'weights_uncompressed/**/*',
  'weights_unused/**/*'
].map(pattern => ({
  pattern,
  watched: false,
  included: false,
  served: true,
  nocache: false
}))

let exclude = (
  process.env.UUT
    ? [
        'dom',
        'faceLandmarkNet',
        'faceRecognitionNet',
        'ssdMobilenetv1',
        'tinyFaceDetector'
      ]
    : []
  )
    .filter(ex => ex !== process.env.UUT)
    .map(ex => `test/tests/${ex}/*.ts`)

// exclude nodejs tests
exclude = exclude.concat(['**/*.node.test.ts'])
exclude = exclude.concat(['test/env.node.ts'])
exclude = exclude.concat(['test/tests-legacy/**/*.ts'])


export default function(config) {
  const args = []
  if (process.env.BACKEND_CPU) {
    args.push('backend_cpu')
  }

  config.set({
    frameworks: ['jasmine', 'karma-typescript'],
    files: [
      'node_modules/tslib/tslib.js',
      'src/**/*.ts',
      'test/**/*.ts'
    ].concat(dataFiles),
    exclude,
    preprocessors: {
      '**/*.ts': ['karma-typescript']
    },
    karmaTypescriptConfig: {
      tsconfig: 'tsconfig.test-browser.json',
      bundlerOptions: {
        sourceMap: true,
        addNodeGlobals: true,
        ignore: ['tslib']
      }
    },
    browsers: ['Chrome'],
    browserNoActivityTimeout: 120000,
    browserDisconnectTolerance: 3,
    browserDisconnectTimeout : 120000,
    captureTimeout: 60000,
    client: {
      jasmine: {
        timeoutInterval: 60000,
        args
      }
    }
  })
}
