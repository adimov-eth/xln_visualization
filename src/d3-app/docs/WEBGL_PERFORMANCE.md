# WebGL Performance Optimization Guide for XLN

## Overview

This guide details the WebGL rendering strategies and optimizations required to achieve 60 FPS performance with 10,000+ nodes in the XLN network visualization.

## Core Performance Challenges

1. **Scale**: Rendering 10,000+ nodes and potentially 100,000+ edges
2. **Real-time Updates**: Processing hundreds of updates per second
3. **Interactivity**: Maintaining smooth pan, zoom, and selection
4. **Visual Quality**: Preserving aesthetics while optimizing performance
5. **Memory Constraints**: Managing GPU memory efficiently

## WebGL Rendering Architecture

### Three-Tier Rendering System

```typescript
class XLNRenderer {
  // Tier 1: Instanced mesh for nodes
  private nodeRenderer: InstancedNodeRenderer;
  
  // Tier 2: Line segments for edges  
  private edgeRenderer: BatchedEdgeRenderer;
  
  // Tier 3: Overlay for UI elements
  private overlayRenderer: Canvas2DRenderer;
  
  render(scene: XLNScene) {
    // Clear and prepare
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    
    // Render in optimal order
    this.edgeRenderer.render(scene.edges);    // Back layer
    this.nodeRenderer.render(scene.nodes);    // Middle layer
    this.overlayRenderer.render(scene.ui);    // Front layer
  }
}
```

## Node Rendering Optimizations

### 1. Instanced Rendering

```typescript
class InstancedNodeRenderer {
  private instancedMesh: THREE.InstancedMesh;
  private instanceMatrix: Float32Array;
  private instanceColor: Float32Array;
  private instanceData: Float32Array; // Custom attributes
  
  constructor(maxInstances: number = 20000) {
    // Base geometry - optimized sphere
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    
    // Instanced material with custom shader
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        cameraPosition: { value: new THREE.Vector3() },
        fogDistance: { value: 1000 },
        selectedNodes: { value: new Float32Array(100) }, // IDs of selected nodes
      },
      vertexShader: INSTANCED_VERTEX_SHADER,
      fragmentShader: INSTANCED_FRAGMENT_SHADER,
      defines: {
        USE_INSTANCING: true,
        MAX_SELECTED: 100
      }
    });
    
    this.instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      maxInstances
    );
    
    // Enable frustum culling
    this.instancedMesh.frustumCulled = true;
    
    // Allocate instance buffers
    this.instanceMatrix = new Float32Array(maxInstances * 16);
    this.instanceColor = new Float32Array(maxInstances * 3);
    this.instanceData = new Float32Array(maxInstances * 4);
    
    // Add custom attributes
    this.setupInstanceAttributes();
  }
  
  private setupInstanceAttributes() {
    const mesh = this.instancedMesh;
    
    // Custom instance attributes
    mesh.geometry.setAttribute(
      'instanceData',
      new THREE.InstancedBufferAttribute(this.instanceData, 4)
    );
  }
  
  updateInstances(nodes: NetworkNode[]) {
    const visibleNodes = this.frustumCull(nodes);
    const lodNodes = this.applyLOD(visibleNodes);
    
    // Update instance data
    for (let i = 0; i < lodNodes.length; i++) {
      const node = lodNodes[i];
      const offset = i * 16;
      
      // Update transformation matrix
      this.updateMatrix(node, offset);
      
      // Update color
      this.updateColor(node, i * 3);
      
      // Update custom data (size, type, state, etc.)
      this.updateCustomData(node, i * 4);
    }
    
    // Upload to GPU
    this.instancedMesh.count = lodNodes.length;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    (this.instancedMesh.geometry.attributes.instanceData as any).needsUpdate = true;
  }
}
```

### 2. Level of Detail (LOD) System

```typescript
class LODSystem {
  private levels: LODLevel[] = [
    { distance: 100, quality: 'high', geometry: 'sphere' },
    { distance: 500, quality: 'medium', geometry: 'octahedron' },
    { distance: 1000, quality: 'low', geometry: 'box' },
    { distance: Infinity, quality: 'billboard', geometry: 'point' }
  ];
  
  calculateLOD(node: NetworkNode, camera: Camera): LODResult {
    const distance = camera.position.distanceTo(node.position);
    const screenSize = this.projectToScreenSize(node, camera);
    
    // Dynamic LOD based on screen coverage
    if (screenSize < 2) return { level: 'billboard', scale: 0 };
    if (screenSize < 10) return { level: 'low', scale: 1 };
    if (screenSize < 50) return { level: 'medium', scale: 1 };
    return { level: 'high', scale: 1 };
  }
  
  private projectToScreenSize(node: NetworkNode, camera: Camera): number {
    // Project node bounds to screen space
    const projected = node.position.clone();
    projected.project(camera);
    
    // Calculate pixel size
    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;
    
    const nodeRadius = node.size || 10;
    const screenRadius = nodeRadius * Math.min(widthHalf, heightHalf) / 
                        projected.z;
    
    return screenRadius;
  }
}
```

### 3. Frustum Culling

```typescript
class FrustumCuller {
  private frustum: THREE.Frustum;
  private projScreenMatrix: THREE.Matrix4;
  
  updateFrustum(camera: THREE.Camera) {
    this.projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
  }
  
  cullNodes(nodes: NetworkNode[]): NetworkNode[] {
    // Use spatial index for broad phase
    const candidates = this.spatialIndex.query(this.frustum);
    
    // Fine-grained culling
    return candidates.filter(node => {
      const sphere = new THREE.Sphere(node.position, node.size);
      return this.frustum.intersectsSphere(sphere);
    });
  }
}
```

## Edge Rendering Optimizations

### 1. Batched Line Rendering

```typescript
class BatchedEdgeRenderer {
  private lineGeometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private lineWidths: Float32Array;
  
  constructor(maxEdges: number = 100000) {
    this.positions = new Float32Array(maxEdges * 6); // 2 vertices * 3 coords
    this.colors = new Float32Array(maxEdges * 6);    // 2 vertices * 3 colors
    this.lineWidths = new Float32Array(maxEdges * 2); // 2 vertices * 1 width
    
    this.setupGeometry();
  }
  
  private setupGeometry() {
    this.lineGeometry = new THREE.BufferGeometry();
    
    this.lineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );
    
    this.lineGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.colors, 3)
    );
    
    this.lineGeometry.setAttribute(
      'lineWidth',
      new THREE.BufferAttribute(this.lineWidths, 1)
    );
  }
  
  updateEdges(edges: NetworkEdge[]) {
    let offset = 0;
    
    // Group edges by type for better batching
    const groupedEdges = this.groupEdgesByType(edges);
    
    for (const [type, edgeGroup] of groupedEdges) {
      const style = this.getEdgeStyle(type);
      
      for (const edge of edgeGroup) {
        // Skip invisible edges
        if (!this.isEdgeVisible(edge)) continue;
        
        // Source position
        this.positions[offset] = edge.source.x;
        this.positions[offset + 1] = edge.source.y;
        this.positions[offset + 2] = edge.source.z;
        
        // Target position
        this.positions[offset + 3] = edge.target.x;
        this.positions[offset + 4] = edge.target.y;
        this.positions[offset + 5] = edge.target.z;
        
        // Colors
        const color = style.color;
        this.colors[offset] = color.r;
        this.colors[offset + 1] = color.g;
        this.colors[offset + 2] = color.b;
        this.colors[offset + 3] = color.r;
        this.colors[offset + 4] = color.g;
        this.colors[offset + 5] = color.b;
        
        // Line widths
        this.lineWidths[offset / 3] = style.width;
        this.lineWidths[offset / 3 + 1] = style.width;
        
        offset += 6;
      }
    }
    
    // Update geometry
    this.lineGeometry.attributes.position.needsUpdate = true;
    this.lineGeometry.attributes.color.needsUpdate = true;
    this.lineGeometry.attributes.lineWidth.needsUpdate = true;
    
    // Set draw range
    this.lineGeometry.setDrawRange(0, offset / 3);
  }
}
```

### 2. Edge Bundling for Dense Networks

```typescript
class EdgeBundler {
  bundle(edges: NetworkEdge[]): BundledEdge[] {
    // Hierarchical edge bundling
    const hierarchy = this.buildHierarchy(edges);
    const bundles = [];
    
    for (const group of hierarchy) {
      if (group.edges.length > BUNDLE_THRESHOLD) {
        const controlPoints = this.calculateControlPoints(group);
        const bundledEdge = this.createBundledEdge(group, controlPoints);
        bundles.push(bundledEdge);
      } else {
        // Keep individual edges
        bundles.push(...group.edges);
      }
    }
    
    return bundles;
  }
  
  private calculateControlPoints(group: EdgeGroup): Vector3[] {
    // Use force-directed bundling
    const points = this.initializeControlPoints(group);
    
    // Iterate to find optimal bundling
    for (let i = 0; i < BUNDLING_ITERATIONS; i++) {
      this.applyBundlingForces(points, group);
    }
    
    return points;
  }
}
```

## GPU Memory Management

### 1. Buffer Pooling

```typescript
class BufferPool {
  private pools: Map<string, BufferAllocation[]> = new Map();
  private allocated: Map<string, Set<BufferAllocation>> = new Map();
  
  allocate(type: string, size: number): BufferAllocation {
    const pool = this.pools.get(type) || [];
    
    // Find available buffer
    let buffer = pool.find(b => b.size >= size && !b.inUse);
    
    if (!buffer) {
      // Create new buffer
      buffer = this.createBuffer(type, size);
      pool.push(buffer);
      this.pools.set(type, pool);
    }
    
    buffer.inUse = true;
    this.allocated.get(type)?.add(buffer) || 
      this.allocated.set(type, new Set([buffer]));
    
    return buffer;
  }
  
  release(buffer: BufferAllocation) {
    buffer.inUse = false;
    buffer.clear(); // Reset buffer content
    
    // Return to pool
    const allocated = this.allocated.get(buffer.type);
    allocated?.delete(buffer);
  }
  
  private createBuffer(type: string, size: number): BufferAllocation {
    switch (type) {
      case 'position':
        return {
          type,
          size,
          buffer: new Float32Array(size),
          inUse: false,
          clear: () => this.buffer.fill(0)
        };
      case 'color':
        return {
          type,
          size,
          buffer: new Uint8Array(size),
          inUse: false,
          clear: () => this.buffer.fill(255)
        };
      default:
        throw new Error(`Unknown buffer type: ${type}`);
    }
  }
}
```

### 2. Texture Atlasing

```typescript
class TextureAtlasManager {
  private atlas: THREE.DataTexture;
  private packer: BinPacker;
  private regions: Map<string, AtlasRegion> = new Map();
  
  constructor(size: number = 4096) {
    // Create atlas texture
    this.atlas = new THREE.DataTexture(
      new Uint8Array(size * size * 4),
      size,
      size,
      THREE.RGBAFormat
    );
    
    this.packer = new BinPacker(size, size);
  }
  
  addTexture(id: string, imageData: ImageData): AtlasRegion | null {
    // Try to pack texture
    const node = this.packer.pack(imageData.width, imageData.height);
    
    if (!node) {
      console.warn('Texture atlas full');
      return null;
    }
    
    // Copy texture data to atlas
    this.copyToAtlas(imageData, node.x, node.y);
    
    // Calculate UV coordinates
    const region: AtlasRegion = {
      id,
      x: node.x,
      y: node.y,
      width: imageData.width,
      height: imageData.height,
      u0: node.x / this.atlas.image.width,
      v0: node.y / this.atlas.image.height,
      u1: (node.x + imageData.width) / this.atlas.image.width,
      v1: (node.y + imageData.height) / this.atlas.image.height
    };
    
    this.regions.set(id, region);
    this.atlas.needsUpdate = true;
    
    return region;
  }
}
```

## Shader Optimizations

### 1. Optimized Vertex Shader

```glsl
// Instanced node vertex shader
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec4 instanceData; // size, type, state, selected

// Instance matrices
attribute mat4 instanceMatrix;

// Uniforms
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform float time;
uniform float fogDistance;

// Varyings
varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vFogFactor;
varying float vSelected;
varying float vNodeType;

void main() {
  // Extract instance data
  float nodeSize = instanceData.x;
  float nodeType = instanceData.y;
  float nodeState = instanceData.z;
  float selected = instanceData.w;
  
  // Apply instance transform
  vec4 mvPosition = viewMatrix * instanceMatrix * vec4(position * nodeSize, 1.0);
  
  // Output position
  gl_Position = projectionMatrix * mvPosition;
  
  // Calculate varyings
  vNormal = normalMatrix * normal;
  vViewPosition = -mvPosition.xyz;
  vNodeType = nodeType;
  vSelected = selected;
  
  // Fog calculation
  float fogDepth = length(mvPosition.xyz);
  vFogFactor = smoothstep(fogDistance * 0.5, fogDistance, fogDepth);
  
  // LOD-based vertex displacement
  if (nodeState > 0.5) {
    // Animated pulse for active nodes
    float pulse = sin(time * 3.0 + gl_InstanceID) * 0.05;
    gl_Position.xyz += normalize(position) * pulse;
  }
}
```

### 2. Optimized Fragment Shader

```glsl
precision highp float;

// Varyings
varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vFogFactor;
varying float vSelected;
varying float vNodeType;

// Uniforms
uniform vec3 fogColor;
uniform sampler2D colorPalette; // Node type colors
uniform float opacity;

// Constants
const vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
const vec3 ambientColor = vec3(0.2, 0.2, 0.25);

void main() {
  // Sample color from palette based on node type
  vec3 baseColor = texture2D(colorPalette, vec2(vNodeType / 16.0, 0.5)).rgb;
  
  // Simple lighting
  vec3 normal = normalize(vNormal);
  float NdotL = max(dot(normal, lightDir), 0.0);
  vec3 diffuse = baseColor * (NdotL * 0.8 + 0.2);
  
  // Selection highlight
  if (vSelected > 0.5) {
    diffuse = mix(diffuse, vec3(1.0, 0.8, 0.0), 0.5);
  }
  
  // Apply fog
  vec3 color = mix(diffuse, fogColor, vFogFactor);
  
  // Output
  gl_FragColor = vec4(color, opacity);
  
  // Early discard for invisible fragments
  if (opacity < 0.01) discard;
}
```

## Render Pipeline Optimizations

### 1. Multi-Pass Rendering

```typescript
class MultiPassRenderer {
  private passes: RenderPass[] = [
    new DepthPrePass(),      // Z-prepass for early Z rejection
    new ShadowPass(),        // Shadow mapping (optional)
    new MainPass(),          // Main geometry
    new TransparencyPass(),  // Sorted transparent objects
    new PostProcessPass()    // FXAA, bloom, etc.
  ];
  
  render(scene: Scene, camera: Camera) {
    // Clear once
    this.renderer.clear();
    
    // Execute passes
    for (const pass of this.passes) {
      if (pass.enabled) {
        pass.render(scene, camera, this.renderer);
      }
    }
  }
}

class DepthPrePass extends RenderPass {
  render(scene: Scene, camera: Camera, renderer: WebGLRenderer) {
    // Disable color writes
    renderer.state.colorMask(false);
    
    // Render depth only
    renderer.render(scene, camera, this.depthTarget);
    
    // Re-enable color writes
    renderer.state.colorMask(true);
  }
}
```

### 2. Temporal Optimization

```typescript
class TemporalOptimizer {
  private previousFrame: FrameData;
  private motionVectors: Float32Array;
  
  optimizeFrame(currentFrame: FrameData): OptimizedFrame {
    if (!this.previousFrame) {
      this.previousFrame = currentFrame;
      return { frame: currentFrame, reusePrevious: false };
    }
    
    // Calculate motion vectors
    this.calculateMotionVectors(this.previousFrame, currentFrame);
    
    // Determine which regions need update
    const dirtyRegions = this.findDirtyRegions(this.motionVectors);
    
    // Reuse previous frame data where possible
    if (dirtyRegions.length < DIRTY_THRESHOLD) {
      return {
        frame: currentFrame,
        reusePrevious: true,
        dirtyRegions
      };
    }
    
    this.previousFrame = currentFrame;
    return { frame: currentFrame, reusePrevious: false };
  }
}
```

## Performance Monitoring

### 1. Real-time Metrics

```typescript
class PerformanceMonitor {
  private stats: Stats = new Stats();
  private customMetrics: Map<string, Metric> = new Map();
  
  constructor() {
    // Position stats
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.left = '0px';
    this.stats.dom.style.top = '0px';
    document.body.appendChild(this.stats.dom);
    
    // Initialize custom metrics
    this.addMetric('drawCalls', 'Draw Calls');
    this.addMetric('triangles', 'Triangles');
    this.addMetric('instances', 'Instances');
    this.addMetric('gpuMemory', 'GPU Memory (MB)');
  }
  
  begin() {
    this.stats.begin();
  }
  
  end() {
    this.stats.end();
    this.updateCustomMetrics();
  }
  
  private updateCustomMetrics() {
    const info = this.renderer.info;
    
    this.updateMetric('drawCalls', info.render.calls);
    this.updateMetric('triangles', info.render.triangles);
    this.updateMetric('instances', info.render.instances);
    this.updateMetric('gpuMemory', info.memory.textures / 1024 / 1024);
  }
}
```

### 2. Performance Profiling

```typescript
class RenderProfiler {
  private timings: Map<string, number[]> = new Map();
  
  profile<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    // Store timing
    if (!this.timings.has(name)) {
      this.timings.set(name, []);
    }
    this.timings.get(name)!.push(duration);
    
    // Warn on slow operations
    if (duration > 16.67) {
      console.warn(`Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }
  
  getReport(): ProfileReport {
    const report: ProfileReport = {};
    
    for (const [name, timings] of this.timings) {
      const sorted = timings.sort((a, b) => a - b);
      report[name] = {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: timings.reduce((a, b) => a + b, 0) / timings.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p90: sorted[Math.floor(sorted.length * 0.9)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      };
    }
    
    return report;
  }
}
```

## Best Practices

### 1. Batch State Changes

```typescript
// Bad
nodes.forEach(node => {
  material.uniforms.color.value = node.color;
  renderer.render(node);
});

// Good
const batchedNodes = this.batchByMaterial(nodes);
for (const [material, batch] of batchedNodes) {
  material.uniforms.colors.value = batch.map(n => n.color);
  renderer.render(batch);
}
```

### 2. Minimize Texture Switches

```typescript
// Sort draw calls by texture
const sorted = objects.sort((a, b) => {
  return a.material.map.id - b.material.map.id;
});
```

### 3. Use Appropriate Precision

```glsl
// Use mediump for colors and texture coordinates
precision mediump float;
varying mediump vec2 vUv;
varying mediump vec3 vColor;

// Use highp only for positions
attribute highp vec3 position;
```

### 4. Optimize Blending

```typescript
// Disable blending when not needed
material.transparent = false;
material.blending = THREE.NoBlending;

// Use premultiplied alpha
material.blending = THREE.CustomBlending;
material.blendSrc = THREE.OneFactor;
material.blendDst = THREE.OneMinusSrcAlphaFactor;
```

## Performance Targets

| Metric | Target | Maximum |
|--------|--------|---------|
| Frame Time | <16.67ms | <33.33ms |
| Draw Calls | <100 | <500 |
| Triangles | <1M | <5M |
| GPU Memory | <512MB | <2GB |
| Instances | 10,000 | 50,000 |

## Debugging Tools

### 1. WebGL Inspector Integration

```typescript
if (DEBUG_MODE) {
  // Enable WebGL debugging
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  console.log('Renderer:', gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
  
  // Wrap GL calls for profiling
  wrapGLContext(gl);
}
```

### 2. Spector.js Integration

```typescript
// Capture frame for analysis
const spector = new SPECTOR.Spector();
spector.displayUI();
spector.captureCanvas(renderer.domElement);
```

This comprehensive guide provides the foundation for achieving high-performance WebGL rendering in the XLN visualization system.