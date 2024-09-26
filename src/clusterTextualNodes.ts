import { ClusterProps, Rect } from "./types";

type TextualNode = TextNode | StickyNode;

export async function clusterTextualNodes({
  apiKey,
  threshold,
  isFigJam,
}: ClusterProps) {
  figma.skipInvisibleInstanceChildren = true;

  function isTextualNode(node: SceneNode): node is TextualNode {
    return node.type === "STICKY" || node.type === "TEXT";
  }

  function isNodeVisible(node: TextualNode): boolean {
    return node.visible && node.opacity > 0;
  }

  const selectedLayers = figma.currentPage.selection
    .filter(isTextualNode)
    .filter(isNodeVisible);
  const textLayers =
    selectedLayers.length > 0
      ? selectedLayers
      : (figma.currentPage
          .findAllWithCriteria({
            types: ["STICKY", "TEXT"],
          })
          .filter(isNodeVisible) as TextualNode[]);

  if (!selectedLayers.length && !textLayers.length) {
    throw new Error("No sticky notes or text layers found");
  }

  const textEmbeddings = await getTextEmbeddings({ textLayers, apiKey });

  function calculateDistanceMatrix(embeddings: number[][]): number[][] {
    const matrix = [];
    for (let i = 0; i < embeddings.length; i++) {
      const row = [];
      for (let j = 0; j < i; j++) {
        const distance =
          1 -
          embeddings[i].reduce(
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
    threshold,
  });

  async function generateClusterLabels(
    clusteredLayers: TextualNode[][]
  ): Promise<string[]> {
    const labels = [];

    for (const cluster of clusteredLayers) {
      const texts = cluster.map((layer) => getNodeTextCharacters(layer));
      const maxLength = 20;
      const label = await generateLabel({ apiKey, texts, maxLength });
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

type Cluster = {
  index?: number;
  distance?: number;
  children: Cluster[];
};

function hierarchicalClustering(
  distanceMatrix: number[][],
  threshold: number
): number[][] {
  const clusters: Cluster[] = [];

  // Initialize clusters with single elements
  for (let i = 0; i < distanceMatrix.length; i++) {
    clusters.push({ index: i, children: [] });
  }

  while (clusters.length > 1) {
    // Find the minimum distance and its position in the distance matrix
    let minDistance = Infinity;
    let x: number = 0;
    let y: number = 0;

    for (let i = 0; i < distanceMatrix.length; i++) {
      for (let j = 0; j < i; j++) {
        if (distanceMatrix[i][j] < minDistance) {
          minDistance = distanceMatrix[i][j];
          x = i;
          y = j;
        }
      }
    }

    // Stop clustering if the minimum distance is greater than the threshold
    if (minDistance > threshold) {
      break;
    }

    // Merge clusters
    const newCluster: Cluster = {
      distance: minDistance,
      children: [clusters[x], clusters[y]],
    };

    // Update the distance matrix
    const newRow: number[] = [];
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

    // Remove the merged cluster
    distanceMatrix.splice(x, 1);
    clusters.splice(x, 1);

    // Remove the merged cluster's row and column in the distance matrix
    for (let i = 0; i < distanceMatrix.length; i++) {
      distanceMatrix[i].splice(x, 1);
    }
  }

  return clusters.map(getLeafNodes);
}

function getLeafNodes(cluster: Cluster): number[] {
  if (cluster.children.length === 0) {
    return [cluster.index as number];
  }

  return cluster.children.flatMap(getLeafNodes);
}

function getNodeTextCharacters(node: SceneNode): string {
  if (node.type === "STICKY") {
    return (node as StickyNode).text.characters;
  } else if (node.type === "TEXT") {
    return (node as TextNode).characters;
  } else if (node.type === "COMPONENT") {
    const textChild = node.children.find(
      (child) => child.type === "TEXT" || child.type === "STICKY"
    );
    if (textChild) {
      return textChild.type === "TEXT"
        ? (textChild as TextNode).characters
        : (textChild as StickyNode).text.characters;
    }
  }
  return "";
}

function normalizeEmbeddings(embeddings: number[][]): number[][] {
  return embeddings.map((embedding) => {
    const norm = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));
    return embedding.map((x) => x / norm);
  });
}

async function fetchAvailableModels(
  apiKey: string
): Promise<Array<{ id: string }>> {
  const response = await fetch("https://api.openai.com/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const { data: availableModels } = await response.json();
  return availableModels;
}

function chooseLabelingModel(availableModels: Array<{ id: string }>): string {
  const modelPriority = ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"];
  return (
    modelPriority.find((model) =>
      availableModels.some((availableModel) =>
        availableModel.id.includes(model)
      )
    ) || "gpt-3.5"
  );
}

async function generateLabel({
  apiKey,
  texts,
  maxLength,
}: {
  apiKey: string;
  texts: string[];
  maxLength: number;
}): Promise<string> {
  const text = texts.join(", ");
  const availableModels = await fetchAvailableModels(apiKey);
  const model = chooseLabelingModel(availableModels);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `Your task is to create a concise and descriptive label for a cluster of similar sticky notes. Please follow these guidelines for an effective label:\n
          The sticky notes have been organized through affinity mapping, which groups information based on natural relationships.\n
          Your label should summarize the core idea of the clustered sticky notes in 3 words or fewer.\n
          Avoid using unhelpful words like "category" or "cluster," numbers, quotation marks, periods, or any extraneous punctuation in your output.\n
          \n
          Here are some examples of effective labels:\n
          If the sticky notes focus on improving user interfaces, an effective label could be "UI Enhancements"\n
          If the sticky notes discuss various usability testing methods, a suitable label might be "Usability Testing"\n
          If the sticky notes are related to design principles, an appropriate label could be "Design Principles"\n
          If the sticky notes address accessibility requirements, a good label could be "Accessibility Standards"\n
          If the sticky notes cover strategies for effective user onboarding, a fitting label might be "User Onboarding"\n
          If the sticky notes explore ways to optimize app performance, an apt label could be "Performance Optimization"\n`,
        },
        {
          role: "user",
          content: `Sticky notes collection: ${text}`,
        },
      ],
      max_tokens: maxLength,
    }),
  });

  const data = await response.json();

  if (
    data.choices &&
    data.choices.length > 0 &&
    data.choices[0].message &&
    data.choices[0].message.content
  ) {
    return data.choices[0].message.content.trim();
  } else {
    return "Unknown";
  }
}

function chooseEmbeddingModel(availableModels: Array<{ id: string }>): string {
  const modelPriority = [
    "text-embedding-ada-002",
    "text-embedding-3-large",
    "text-embedding-3-small",
  ];
  return (
    modelPriority.find((model) =>
      availableModels.some((availableModel) =>
        availableModel.id.includes(model)
      )
    ) || "text-embedding-ada-002"
  );
}

async function getTextEmbeddings({
  apiKey,
  textLayers,
}: {
  apiKey: string;
  textLayers: TextualNode[];
}): Promise<number[][]> {
  const availableModels = await fetchAvailableModels(apiKey);

  const texts = textLayers
    .map((layer) => {
      const text =
        layer.type === "STICKY" ? layer.text.characters : layer.characters;
      return text;
    })
    .filter((text) => text.trim() !== "");

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: chooseEmbeddingModel(availableModels),
      input: texts,
    }),
  });

  const data = await response.json();
  if (data.data && data.data.length > 0) {
    const textEmbeddings = data.data.map(
      (item: { embedding: number[] }) => item.embedding
    );
    return textEmbeddings;
  } else {
    throw new Error(data.error.message);
  }
}

function clusterLayers({
  textLayers,
  distanceMatrix,
  threshold = 0.155,
}: {
  textLayers: TextualNode[];
  distanceMatrix: number[][];
  threshold: number;
}): { clusterLabels: string[]; clusteredLayers: TextualNode[][] } {
  const clusters = hierarchicalClustering(distanceMatrix, threshold);

  const clusteredLayers = clusters.map((cluster) =>
    cluster.map((index: number) => textLayers[index])
  );

  const clusterLabels = clusters.map((_, index) => `Cluster ${index + 1}`);

  return { clusterLabels, clusteredLayers };
}

function rearrangeLayersOnCanvas(clusteredLayersData: {
  clusterLabels: string[];
  clusteredLayers: TextualNode[][];
}): void {
  const framePadding = 12;
  const textualNodeSpacing = 40;
  const containerSpacing = 40;
  const { clusterLabels, clusteredLayers } = clusteredLayersData;

  const isFigJam = figma.editorType === "figjam";

  const existingLayers = figma.currentPage.children;
  const boundingBox = calculateBoundingBox(existingLayers);
  let currentXPosition = boundingBox.x + boundingBox.width + containerSpacing;

  const containers: (FrameNode | SectionNode)[] = [];

  for (let i = 0; i < clusteredLayers.length; i++) {
    const cluster = clusteredLayers[i];

    let container;

    if (isFigJam) {
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
      container.itemSpacing = 12;
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
    containers.push(container);
  }

  if (!isFigJam) {
    function isFrameOrComponent(
      node: BaseNode
    ): node is FrameNode | ComponentNode {
      return node.type === "FRAME" || node.type === "COMPONENT";
    }

    // Apply auto layout & padding to frame container
    for (const node of figma.currentPage.children) {
      if (isFrameOrComponent(node) && node.layoutMode !== "NONE") {
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

  figma.viewport.scrollAndZoomIntoView(containers);
}

function calculateBoundingBox(nodes: readonly SceneNode[]): Rect {
  let minX = Number.MAX_VALUE;
  let minY = Number.MAX_VALUE;
  let maxX = Number.MIN_VALUE;
  let maxY = Number.MIN_VALUE;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
