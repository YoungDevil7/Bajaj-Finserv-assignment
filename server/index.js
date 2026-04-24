const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Utility functions for validation and processing
function validateEdge(str) {
  const trimmed = str.trim();
  if (!/^([A-Z])->([A-Z])$/.test(trimmed)) return false;
  const [parent, child] = trimmed.split('->');
  if (parent === child) return false; // self-loop
  return true;
}

function parseEdge(str) {
  const [parent, child] = str.trim().split('->');
  return { parent, child };
}

function processData(data) {
  const invalid_entries = [];
  const duplicate_edges = [];
  const edgeSet = new Set();
  const edges = [];
  const parentMap = new Map(); // child -> parent
  const childrenMap = new Map(); // parent -> Set(children)

  for (const entry of data) {
    const trimmed = entry.trim();
    if (!validateEdge(trimmed)) {
      invalid_entries.push(entry);
      continue;
    }
    if (edgeSet.has(trimmed)) {
      if (!duplicate_edges.includes(trimmed)) duplicate_edges.push(trimmed);
      continue;
    }
    const { parent, child } = parseEdge(trimmed);
    // Only allow first parent for a child
    if (!parentMap.has(child)) {
      parentMap.set(child, parent);
      // Build children map
      if (!childrenMap.has(parent)) childrenMap.set(parent, new Set());
      childrenMap.get(parent).add(child);
      edges.push({ parent, child });
      edgeSet.add(trimmed);
    } else {
      // silently discard multi-parent
      edgeSet.add(trimmed);
    }
  }

  // Find all nodes
  const allNodes = new Set();
  for (const { parent, child } of edges) {
    allNodes.add(parent);
    allNodes.add(child);
  }

  // Find roots (nodes never appearing as child)
  const childNodes = new Set([...parentMap.keys()]);
  const rootCandidates = [...allNodes].filter(n => !childNodes.has(n));

  // Group nodes into connected components
  const visited = new Set();
  const hierarchies = [];
  function dfs(node, group) {
    if (visited.has(node)) return;
    visited.add(node);
    group.add(node);
    if (childrenMap.has(node)) {
      for (const child of childrenMap.get(node)) {
        dfs(child, group);
      }
    }
  }

  // Helper to build tree and detect cycles
  function buildTree(node, path = new Set()) {
    if (path.has(node)) return { cycle: true };
    path.add(node);
    const children = childrenMap.get(node) || new Set();
    const tree = {};
    let maxDepth = 1;
    for (const child of children) {
      const res = buildTree(child, new Set(path));
      if (res.cycle) return { cycle: true };
      tree[child] = res.tree;
      if (res.depth + 1 > maxDepth) maxDepth = res.depth + 1;
    }
    return { tree, depth: maxDepth };
  }

  // Find all groups (connected components)
  const groups = [];
  for (const node of allNodes) {
    if (!visited.has(node)) {
      const group = new Set();
      dfs(node, group);
      groups.push(group);
    }
  }

  let largest_tree_root = null;
  let largest_tree_depth = 0;
  let total_trees = 0;
  let total_cycles = 0;

  for (const group of groups) {
    // Find root(s) in this group
    const groupRoots = [...group].filter(n => !parentMap.has(n));
    let root = groupRoots.length > 0 ? groupRoots.sort()[0] : [...group].sort()[0];
    // Build tree/cycle
    const { tree, depth, cycle } = buildTree(root);
    if (cycle) {
      hierarchies.push({ root, tree: {}, has_cycle: true });
      total_cycles++;
    } else {
      hierarchies.push({ root, tree: { [root]: tree }, depth });
      total_trees++;
      if (depth > largest_tree_depth || (depth === largest_tree_depth && root < largest_tree_root)) {
        largest_tree_depth = depth;
        largest_tree_root = root;
      }
    }
  }

  return {
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees,
      total_cycles,
      largest_tree_root: largest_tree_root || null
    }
  };
}

app.post('/bfhl', (req, res) => {
  const { data } = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'Invalid input: data must be an array.' });
  }
  const result = processData(data);
  res.json({
    user_id: 'souryavarma_24042006',
    email_id: 'sd4755@srmist.edu.in',
    college_roll_number: 'RA2311051010041',
    ...result
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
