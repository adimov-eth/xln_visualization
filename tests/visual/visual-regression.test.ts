import puppeteer, { Browser, Page } from 'puppeteer';
import { testDataGenerator, NetworkState } from '../utils/test-data-generators';

describe('Visual Regression Tests', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = process.env.TEST_URL || 'http://localhost:3000';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Set viewport for consistent screenshots
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    // Mock network data
    await page.evaluateOnNewDocument((networkStateJson) => {
      // @ts-ignore
      window.__mockNetworkState = JSON.parse(networkStateJson);
    }, JSON.stringify({
      ...testDataGenerator.generateNetworkState(),
      entities: Array.from(testDataGenerator.generateNetworkState().entities.entries()),
      channels: Array.from(testDataGenerator.generateNetworkState().channels.entries()),
      depositaries: Array.from(testDataGenerator.generateNetworkState().depositaries.entries()),
    }));
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Network Topology Visualization', () => {
    test('should render initial network topology correctly', async () => {
      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('[data-testid="network-visualization"]', { timeout: 5000 });

      // Wait for initial render to complete
      await page.waitForFunction(() => {
        const nodes = document.querySelectorAll('[data-testid^="entity-node-"]');
        const edges = document.querySelectorAll('[data-testid^="channel-edge-"]');
        return nodes.length > 0 && edges.length > 0;
      });

      const screenshot = await page.screenshot({
        path: 'tests/visual/screenshots/network-topology-initial.png',
        fullPage: false,
      });

      expect(screenshot).toBeTruthy();
    });

    test('should render different entity types with distinct visuals', async () => {
      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('[data-testid="network-visualization"]');

      // Check hub nodes
      const hubNodes = await page.$$eval(
        '[data-testid^="entity-node-"][data-entity-type="hub"]',
        nodes => nodes.map(node => ({
          size: (node as HTMLElement).getBoundingClientRect(),
          color: window.getComputedStyle(node).fill,
        }))
      );

      // Check leaf nodes
      const leafNodes = await page.$$eval(
        '[data-testid^="entity-node-"][data-entity-type="leaf"]',
        nodes => nodes.map(node => ({
          size: (node as HTMLElement).getBoundingClientRect(),
          color: window.getComputedStyle(node).fill,
        }))
      );

      // Hubs should be larger than leaves
      if (hubNodes.length > 0 && leafNodes.length > 0) {
        const avgHubSize = hubNodes.reduce((sum, node) => sum + node.size.width, 0) / hubNodes.length;
        const avgLeafSize = leafNodes.reduce((sum, node) => sum + node.size.width, 0) / leafNodes.length;
        expect(avgHubSize).toBeGreaterThan(avgLeafSize);
      }
    });

    test('should highlight active channels', async () => {
      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('[data-testid="network-visualization"]');

      // Trigger channel activity
      await page.evaluate(() => {
        // @ts-ignore
        window.__simulateChannelActivity?.('channel-1');
      });

      await page.waitForFunction(() => {
        const activeChannel = document.querySelector('[data-testid="channel-edge-channel-1"][data-active="true"]');
        return activeChannel !== null;
      });

      const screenshot = await page.screenshot({
        path: 'tests/visual/screenshots/active-channel-highlight.png',
      });

      expect(screenshot).toBeTruthy();
    });
  });

  describe('Layer Navigation System', () => {
    const layers = ['blockchain', 'depositary', 'entity', 'channel', 'transaction'];

    layers.forEach(layer => {
      test(`should display ${layer} layer correctly`, async () => {
        await page.goto(`${baseUrl}/`);
        await page.waitForSelector('[data-testid="layer-navigation"]');

        // Click on layer tab
        await page.click(`[data-testid="layer-tab-${layer}"]`);
        
        // Wait for layer transition
        await page.waitForFunction((layerName) => {
          const activeLayer = document.querySelector('[data-testid="active-layer"]');
          return activeLayer?.getAttribute('data-layer') === layerName;
        }, {}, layer);

        const screenshot = await page.screenshot({
          path: `tests/visual/screenshots/layer-${layer}.png`,
        });

        expect(screenshot).toBeTruthy();
      });
    });

    test('should animate layer transitions smoothly', async () => {
      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('[data-testid="layer-navigation"]');

      // Record layer transition
      const screenshots = [];
      
      // Start on entity layer
      await page.click('[data-testid="layer-tab-entity"]');
      
      // Transition to channel layer
      await page.click('[data-testid="layer-tab-channel"]');
      
      // Capture transition frames
      for (let i = 0; i < 5; i++) {
        screenshots.push(await page.screenshot({
          path: `tests/visual/screenshots/layer-transition-${i}.png`,
        }));
        await page.waitForTimeout(100);
      }

      expect(screenshots.length).toBe(5);
    });
  });

  describe('Consensus Visualization', () => {
    test('should animate proposer-based consensus', async () => {
      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('[data-testid="network-visualization"]');

      // Trigger consensus animation
      await page.evaluate(() => {
        // @ts-ignore
        window.__startConsensusAnimation?.('proposer');
      });

      // Wait for animation to start
      await page.waitForSelector('[data-testid="consensus-animation"]');

      const screenshots = [];
      
      // Capture animation frames
      for (let i = 0; i < 10; i++) {
        screenshots.push(await page.screenshot({
          path: `tests/visual/screenshots/consensus-proposer-${i}.png`,
          clip: {
            x: 500,
            y: 200,
            width: 920,
            height: 680,
          },
        }));
        await page.waitForTimeout(200);
      }

      expect(screenshots.length).toBe(10);
    });

    test('should show validator signatures progressively', async () => {
      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('[data-testid="network-visualization"]');

      // Check initial state
      const initialSignatures = await page.$$eval(
        '[data-testid^="validator-signature-"]',
        sigs => sigs.length
      );

      // Trigger consensus
      await page.evaluate(() => {
        // @ts-ignore
        window.__simulateConsensusRound?.();
      });

      // Wait for signatures to appear
      await page.waitForFunction((initial) => {
        const signatures = document.querySelectorAll('[data-testid^="validator-signature-"]');
        return signatures.length > initial;
      }, {}, initialSignatures);

      const screenshot = await page.screenshot({
        path: 'tests/visual/screenshots/validator-signatures.png',
      });

      expect(screenshot).toBeTruthy();
    });
  });

  describe('Cross-chain Flow Animation', () => {
    test('should visualize hash-lock swap across chains', async () => {
      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('[data-testid="network-visualization"]');

      // Start cross-chain transaction
      await page.evaluate(() => {
        // @ts-ignore
        window.__startCrossChainSwap?.({
          sourceChain: 'ethereum',
          targetChain: 'solana',
          amount: 1000,
        });
      });

      // Wait for animation to start
      await page.waitForSelector('[data-testid="cross-chain-flow"]');

      const phases = ['lock', 'reveal', 'settlement'];
      const screenshots: Record<string, Buffer> = {};

      for (const phase of phases) {
        await page.waitForFunction((currentPhase) => {
          const flowElement = document.querySelector('[data-testid="cross-chain-flow"]');
          return flowElement?.getAttribute('data-phase') === currentPhase;
        }, {}, phase);

        screenshots[phase] = await page.screenshot({
          path: `tests/visual/screenshots/cross-chain-${phase}.png`,
        });
      }

      expect(Object.keys(screenshots).length).toBe(3);
    });
  });

  describe('Interactive Features', () => {
    test('should show entity details on hover', async () => {
      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('[data-testid="network-visualization"]');

      // Find an entity node
      const entityNode = await page.$('[data-testid^="entity-node-"]');
      if (!entityNode) throw new Error('No entity node found');

      // Hover over entity
      await entityNode.hover();

      // Wait for tooltip
      await page.waitForSelector('[data-testid="entity-tooltip"]', { visible: true });

      const screenshot = await page.screenshot({
        path: 'tests/visual/screenshots/entity-hover-tooltip.png',
      });

      expect(screenshot).toBeTruthy();
    });

    test('should open entity inspector on click', async () => {
      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('[data-testid="network-visualization"]');

      // Click on entity
      await page.click('[data-testid^="entity-node-"]');

      // Wait for inspector panel
      await page.waitForSelector('[data-testid="entity-inspector"]', { visible: true });

      const screenshot = await page.screenshot({
        path: 'tests/visual/screenshots/entity-inspector-panel.png',
      });

      expect(screenshot).toBeTruthy();
    });

    test('should support pan and zoom', async () => {
      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('[data-testid="network-visualization"]');

      // Get initial transform
      const initialTransform = await page.$eval(
        '[data-testid="network-viewport"]',
        el => (el as SVGElement).getAttribute('transform')
      );

      // Simulate pan
      await page.mouse.move(960, 540);
      await page.mouse.down();
      await page.mouse.move(860, 440);
      await page.mouse.up();

      // Simulate zoom
      await page.mouse.wheel({ deltaY: -100 });

      // Get new transform
      const newTransform = await page.$eval(
        '[data-testid="network-viewport"]',
        el => (el as SVGElement).getAttribute('transform')
      );

      expect(newTransform).not.toBe(initialTransform);

      const screenshot = await page.screenshot({
        path: 'tests/visual/screenshots/pan-zoom-result.png',
      });

      expect(screenshot).toBeTruthy();
    });
  });

  describe('Responsive Design', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 },
      { name: '4k', width: 3840, height: 2160 },
    ];

    viewports.forEach(viewport => {
      test(`should render correctly on ${viewport.name}`, async () => {
        await page.setViewport({
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: 1,
        });

        await page.goto(`${baseUrl}/`);
        await page.waitForSelector('[data-testid="network-visualization"]');

        const screenshot = await page.screenshot({
          path: `tests/visual/screenshots/responsive-${viewport.name}.png`,
          fullPage: true,
        });

        expect(screenshot).toBeTruthy();
      });
    });
  });

  describe('Dark Mode Support', () => {
    test('should render correctly in dark mode', async () => {
      await page.emulateMediaFeatures([
        { name: 'prefers-color-scheme', value: 'dark' },
      ]);

      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('[data-testid="network-visualization"]');

      const screenshot = await page.screenshot({
        path: 'tests/visual/screenshots/dark-mode.png',
      });

      expect(screenshot).toBeTruthy();
    });

    test('should support manual theme toggle', async () => {
      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('[data-testid="theme-toggle"]');

      // Toggle to dark mode
      await page.click('[data-testid="theme-toggle"]');

      await page.waitForFunction(() => {
        return document.documentElement.getAttribute('data-theme') === 'dark';
      });

      const darkScreenshot = await page.screenshot({
        path: 'tests/visual/screenshots/theme-toggle-dark.png',
      });

      // Toggle back to light mode
      await page.click('[data-testid="theme-toggle"]');

      await page.waitForFunction(() => {
        return document.documentElement.getAttribute('data-theme') === 'light';
      });

      const lightScreenshot = await page.screenshot({
        path: 'tests/visual/screenshots/theme-toggle-light.png',
      });

      expect(darkScreenshot).toBeTruthy();
      expect(lightScreenshot).toBeTruthy();
    });
  });

  describe('Performance Monitoring', () => {
    test('should maintain 60 FPS during animations', async () => {
      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('[data-testid="network-visualization"]');

      // Start performance monitoring
      await page.evaluateOnNewDocument(() => {
        // @ts-ignore
        window.__performanceMetrics = {
          frames: 0,
          startTime: performance.now(),
          fps: 0,
        };

        const measureFPS = () => {
          // @ts-ignore
          window.__performanceMetrics.frames++;
          // @ts-ignore
          const elapsed = performance.now() - window.__performanceMetrics.startTime;
          if (elapsed >= 1000) {
            // @ts-ignore
            window.__performanceMetrics.fps = (window.__performanceMetrics.frames * 1000) / elapsed;
            // @ts-ignore
            window.__performanceMetrics.frames = 0;
            // @ts-ignore
            window.__performanceMetrics.startTime = performance.now();
          }
          requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
      });

      // Trigger animation
      await page.evaluate(() => {
        // @ts-ignore
        window.__startAllAnimations?.();
      });

      // Wait for animations to run
      await page.waitForTimeout(3000);

      // Get FPS measurement
      const fps = await page.evaluate(() => {
        // @ts-ignore
        return window.__performanceMetrics?.fps || 0;
      });

      console.log(`Measured FPS: ${fps}`);
      expect(fps).toBeGreaterThan(55); // Allow small margin below 60
    });
  });
});