(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/@create-figma-plugin/utilities/lib/events.js
  function on(name, handler) {
    const id = `${currentId}`;
    currentId += 1;
    eventHandlers[id] = { handler, name };
    return function() {
      delete eventHandlers[id];
    };
  }
  function once(name, handler) {
    let done = false;
    return on(name, function(...args) {
      if (done === true) {
        return;
      }
      done = true;
      handler(...args);
    });
  }
  function invokeEventHandler(name, args) {
    for (const id in eventHandlers) {
      if (eventHandlers[id].name === name) {
        eventHandlers[id].handler.apply(null, args);
      }
    }
  }
  var eventHandlers, currentId, emit;
  var init_events = __esm({
    "node_modules/@create-figma-plugin/utilities/lib/events.js"() {
      eventHandlers = {};
      currentId = 0;
      emit = typeof window === "undefined" ? function(name, ...args) {
        figma.ui.postMessage([name, ...args]);
      } : function(name, ...args) {
        window.parent.postMessage({
          pluginMessage: [name, ...args]
        }, "*");
      };
      if (typeof window === "undefined") {
        figma.ui.onmessage = function([name, ...args]) {
          invokeEventHandler(name, args);
        };
      } else {
        window.onmessage = function(event) {
          if (typeof event.data.pluginMessage === "undefined") {
            return;
          }
          const [name, ...args] = event.data.pluginMessage;
          invokeEventHandler(name, args);
        };
      }
    }
  });

  // node_modules/@create-figma-plugin/utilities/lib/settings.js
  async function loadSettingsAsync(defaultSettings2, settingsKey = DEFAULT_SETTINGS_KEY) {
    const settings = await figma.clientStorage.getAsync(settingsKey);
    if (typeof settings === "undefined") {
      return defaultSettings2;
    }
    return Object.assign({}, defaultSettings2, settings);
  }
  async function saveSettingsAsync(settings, settingsKey = DEFAULT_SETTINGS_KEY) {
    await figma.clientStorage.setAsync(settingsKey, settings);
  }
  var DEFAULT_SETTINGS_KEY;
  var init_settings = __esm({
    "node_modules/@create-figma-plugin/utilities/lib/settings.js"() {
      DEFAULT_SETTINGS_KEY = "settings";
    }
  });

  // node_modules/@create-figma-plugin/utilities/lib/ui.js
  function showUI(options, data) {
    if (typeof __html__ === "undefined") {
      throw new Error("No UI defined");
    }
    const html = `<div id="create-figma-plugin"></div><script>document.body.classList.add('theme-${figma.editorType}');const __FIGMA_COMMAND__='${typeof figma.command === "undefined" ? "" : figma.command}';const __SHOW_UI_DATA__=${JSON.stringify(typeof data === "undefined" ? {} : data)};${__html__}<\/script>`;
    figma.showUI(html, __spreadProps(__spreadValues({}, options), {
      themeColors: typeof options.themeColors === "undefined" ? true : options.themeColors
    }));
  }
  var init_ui = __esm({
    "node_modules/@create-figma-plugin/utilities/lib/ui.js"() {
    }
  });

  // node_modules/@create-figma-plugin/utilities/lib/index.js
  var init_lib = __esm({
    "node_modules/@create-figma-plugin/utilities/lib/index.js"() {
      init_events();
      init_settings();
      init_ui();
    }
  });

  // src/clusterTextualNodes.ts
  async function clusterTextualNodes({
    apiKey,
    threshold
  }) {
    function isTextualNode(node) {
      return isFigJam ? node.type === "STICKY" : node.type === "TEXT";
    }
    const textLayers = figma.currentPage.findAll(isTextualNode);
    const textEmbeddings = await getTextEmbeddings({ textLayers, apiKey });
    function calculateDistanceMatrix(embeddings) {
      const matrix = [];
      for (let i = 0; i < embeddings.length; i++) {
        const row = [];
        for (let j = 0; j < i; j++) {
          const distance = 1 - embeddings[i].reduce(
            (sum, val, idx) => sum + val * embeddings[j][idx],
            0
          );
          row.push(distance);
        }
        matrix.push(row);
      }
      return matrix;
    }
    const normalizedEmbeddings = normalizeEmbeddings(textEmbeddings);
    const distanceMatrix = calculateDistanceMatrix(normalizedEmbeddings);
    const clusteredLayersData = clusterLayers({
      textLayers,
      distanceMatrix,
      threshold
    });
    async function generateClusterLabels(clusteredLayers) {
      const labels = [];
      for (const cluster of clusteredLayers) {
        const texts = cluster.map((layer) => getNodeTextCharacters(layer));
        const maxLength = 20;
        const label = await generateSummary({ apiKey, texts, maxLength });
        labels.push(label);
      }
      return labels;
    }
    const clusterLabels = await generateClusterLabels(
      clusteredLayersData.clusteredLayers
    );
    clusteredLayersData.clusterLabels = clusterLabels;
    rearrangeLayersOnCanvas(clusteredLayersData);
  }
  function hierarchicalClustering(distanceMatrix, threshold) {
    const clusters = [];
    for (let i = 0; i < distanceMatrix.length; i++) {
      clusters.push({ index: i, children: [] });
    }
    while (clusters.length > 1) {
      let minDistance = Infinity;
      let x = 0;
      let y = 0;
      for (let i = 0; i < distanceMatrix.length; i++) {
        for (let j = 0; j < i; j++) {
          if (distanceMatrix[i][j] < minDistance) {
            minDistance = distanceMatrix[i][j];
            x = i;
            y = j;
          }
        }
      }
      if (minDistance > threshold) {
        break;
      }
      const newCluster = {
        distance: minDistance,
        children: [clusters[x], clusters[y]]
      };
      const newRow = [];
      for (let i = 0; i < y; i++) {
        newRow.push(Math.min(distanceMatrix[x][i], distanceMatrix[y][i]));
      }
      for (let i = y + 1; i < x; i++) {
        newRow.push(Math.min(distanceMatrix[x][i], distanceMatrix[i][y]));
      }
      for (let i = x + 1; i < distanceMatrix.length; i++) {
        newRow.push(Math.min(distanceMatrix[i][x], distanceMatrix[i][y]));
      }
      distanceMatrix[y] = newRow;
      clusters[y] = newCluster;
      distanceMatrix.splice(x, 1);
      clusters.splice(x, 1);
      for (let i = 0; i < distanceMatrix.length; i++) {
        distanceMatrix[i].splice(x, 1);
      }
    }
    return clusters.map(getLeafNodes);
  }
  function getLeafNodes(cluster) {
    if (cluster.children.length === 0) {
      return [cluster.index];
    }
    return cluster.children.flatMap(getLeafNodes);
  }
  function getNodeTextCharacters(node) {
    return node.type === "STICKY" ? node.text.characters : node.characters;
  }
  function normalizeEmbeddings(embeddings) {
    return embeddings.map((embedding) => {
      const norm = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));
      return embedding.map((x) => x / norm);
    });
  }
  async function generateSummary({
    apiKey,
    texts,
    maxLength
  }) {
    const text = texts.join(", ");
    const response = await fetch("https://api.openai.com/v1/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "text-davinci-003",
        prompt: `Your task is to create a concise and descriptive label for a cluster of similar sticky notes. Please follow these guidelines for an effective label:


The sticky notes have been organized through affinity mapping, which groups information based on natural relationships.

Your label should summarize the core idea of the clustered sticky notes in 3 words or fewer.

Avoid using unhelpful words like "category" or "cluster," numbers, quotation marks, periods, or any extraneous punctuation in your output.



Here are some examples of effective labels:

If the sticky notes focus on improving user interfaces, an effective label could be "UI Enhancements"

If the sticky notes discuss various usability testing methods, a suitable label might be "Usability Testing"

If the sticky notes are related to design principles, an appropriate label could be "Design Principles"

If the sticky notes address accessibility requirements, a good label could be "Accessibility Standards"

If the sticky notes cover strategies for effective user onboarding, a fitting label might be "User Onboarding"

If the sticky notes explore ways to optimize app performance, an apt label could be "Performance Optimization"



Sticky notes: ${text}

Generate Label:`,
        max_tokens: maxLength
      })
    });
    const data = await response.json();
    console.log({ data });
    if (data.choices && data.choices.length > 0 && data.choices[0].text) {
      return data.choices[0].text.trim();
    } else {
      return "Unknown";
    }
  }
  async function getTextEmbeddings({
    apiKey,
    textLayers
  }) {
    const texts = textLayers.map((layer) => getNodeTextCharacters(layer)).filter((text) => text.trim() !== "");
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: texts
      })
    });
    const data = await response.json();
    console.log({ data });
    if (data.data && data.data.length > 0) {
      const textEmbeddings = data.data.map(
        (item) => item.embedding
      );
      return textEmbeddings;
    } else {
      throw new Error(data.error.message);
    }
  }
  function clusterLayers({
    textLayers,
    distanceMatrix,
    threshold = 0.155
  }) {
    console.log(threshold);
    const clusters = hierarchicalClustering(distanceMatrix, threshold);
    const clusteredLayers = clusters.map(
      (cluster) => cluster.map((index) => textLayers[index])
    );
    const clusterLabels = clusters.map((_, index) => `Cluster ${index + 1}`);
    return { clusterLabels, clusteredLayers };
  }
  function rearrangeLayersOnCanvas(clusteredLayersData) {
    const framePadding = 12;
    const textualNodeSpacing = 40;
    const containerSpacing = 40;
    const { clusterLabels, clusteredLayers } = clusteredLayersData;
    let currentXPosition = containerSpacing;
    const isFigJam2 = figma.editorType === "figjam";
    for (let i = 0; i < clusteredLayers.length; i++) {
      const cluster = clusteredLayers[i];
      let container;
      if (isFigJam2) {
        container = figma.createSection();
        container.name = clusterLabels[i];
      } else {
        container = figma.createFrame();
        container.clipsContent = true;
        container.name = clusterLabels[i];
        container.layoutMode = "VERTICAL";
        container.primaryAxisAlignItems = "MIN";
        container.counterAxisAlignItems = "MIN";
        container.paddingBottom = framePadding;
        container.paddingTop = framePadding;
        container.paddingLeft = framePadding;
        container.paddingRight = framePadding;
        container.counterAxisSizingMode = "AUTO";
        container.layoutGrow = 1;
      }
      container.x = currentXPosition;
      container.y = containerSpacing;
      let currentYPosition = textualNodeSpacing;
      let maxHeight = 0;
      let width = 0;
      for (let j = 0; j < cluster.length; j++) {
        const layer = cluster[j];
        layer.x = textualNodeSpacing;
        layer.y = currentYPosition;
        width = layer.width;
        maxHeight += layer.height;
        container.appendChild(layer);
        currentYPosition += layer.height + textualNodeSpacing;
      }
      const containerWidth = width + textualNodeSpacing * 2;
      const containerHeight = currentYPosition;
      container.resizeWithoutConstraints(containerWidth, containerHeight);
      figma.currentPage.appendChild(container);
      currentXPosition += containerWidth + containerSpacing;
    }
    if (!isFigJam2) {
      let isFrameOrComponent2 = function(node) {
        return node.type === "FRAME" || node.type === "COMPONENT";
      };
      var isFrameOrComponent = isFrameOrComponent2;
      for (const node of figma.currentPage.children) {
        if (isFrameOrComponent2(node) && node.layoutMode !== "NONE") {
          node.y = containerSpacing;
          node.layoutMode = "VERTICAL";
          node.primaryAxisAlignItems = "MIN";
          node.counterAxisAlignItems = "MIN";
          node.counterAxisSizingMode = "AUTO";
          node.layoutGrow = 1;
          node.paddingBottom = framePadding;
          node.paddingTop = framePadding;
          node.paddingLeft = framePadding;
          node.paddingRight = framePadding;
        } else if (node.type === "SECTION") {
          node.y = containerSpacing;
        }
      }
    }
  }
  var isFigJam;
  var init_clusterTextualNodes = __esm({
    "src/clusterTextualNodes.ts"() {
      "use strict";
      isFigJam = figma.editorType === "figjam";
    }
  });

  // src/main.ts
  var main_exports = {};
  __export(main_exports, {
    default: () => main_default,
    defaultSettings: () => defaultSettings
  });
  function main_default() {
    on("SAVE_API_KEY", async function(apiKey) {
      try {
        await saveSettingsAsync({ apiKey }, SETTINGS_KEY);
      } catch (error) {
        emit("HANDLE_ERROR", error.message);
      }
    });
    once("SET_UI_LOADED", async function() {
      emit("SET_IS_FIGJAM", figma.editorType === "figjam");
      const settings = await loadSettingsAsync(defaultSettings, SETTINGS_KEY);
      console.log("loaded settings", settings);
      emit("GET_SETTINGS", settings);
    });
    on("CLUSTER_TEXTUAL_NODES", async function() {
      try {
        emit("SET_LOADING", true);
        const { apiKey, threshold } = await loadSettingsAsync(
          defaultSettings,
          SETTINGS_KEY
        );
        console.log({ apiKey, threshold });
        await clusterTextualNodes({ apiKey, threshold });
      } catch (error) {
        emit("HANDLE_ERROR", error.message);
      } finally {
        emit("SET_LOADING", false);
      }
    });
    showUI({
      height: 200,
      width: 280
    });
  }
  var SETTINGS_KEY, defaultSettings;
  var init_main = __esm({
    "src/main.ts"() {
      "use strict";
      init_lib();
      init_clusterTextualNodes();
      SETTINGS_KEY = "autocluster-settings";
      defaultSettings = {
        apiKey: "",
        // threshold: 0.155,
        threshold: 0.16
      };
    }
  });

  // <stdin>
  var modules = { "src/main.ts--default": (init_main(), __toCommonJS(main_exports))["default"] };
  var commandId = true ? "src/main.ts--default" : figma.command;
  modules[commandId]();
})();
