CodeSight: High-Level System Specification
1. Project Intention & Strategic Goals
The fundamental goal of CodeSight is to eliminate Architectural Blindness in rapidly scaling JavaScript and TypeScript environments. Modern directory structures organize files mechanically (by physical location) rather than logically (by domain capability or behavioral intent). This mismatch forces developers to spend an excessive amount of cognitive energy tracing complex dependencies, data boundaries, and hidden software connections just to implement isolated changes safely.

CodeSight solves this by functioning as an Autonomous Architectural Intelligence Engine. It shifts codebase visualization away from brittle, static layout diagrams and instead maps the codebase dynamically based on structural imports, execution pathways, and historical repository footprints. By balancing deterministic code analysis with data-density clustering and semantic AI analysis, CodeSight reveals the genuine functional modules running under the hood of an application. This accelerates developer onboarding, streamlines code maintenance, and prevents the gradual decay of clean software architecture.

2. Dynamic Workflow Overview
The system coordinates an automated analysis loop that bridges a raw local codebase with an interactive graph workspace user interface: 

+--------------------+       +-----------------------------+       +-------------------------+
|                    |       |  Automated Analysis Core    |       |  ReactFlow Frontend    |
| [ Target Codebase ]| ----> |  - Tree-sitter AST Parsing  | ----> |  - Interactive Clusters |
|  - Source Files    |       |  - Git Temporal Analytics   |       |  - Structural Editing  |
|  - Git Repository  |       |  - Multi-Layer Clustering   |       |  - In-Context Guides   |
+--------------------+       +-----------------------------+       +-------------------------+
                                            ^                                   |
                                            |                                   v
                                            +------------------------ [ Metadata Persistence ]
                                                                        - Postgresql Schema 

Autonomous Discovery & Extraction: The system ingests the target project directory, instantly flags the structural paradigm of the software, strips file system noise, and uses Tree-sitter abstract syntax tree parsing to map function invocations and core dependencies.                                                      

Behavioral Analytics Overlay: The engine opens the hidden local Git logs, processing historical co-change patterns to weight nodes based on which files evolve together in real-world engineering sprints. 

Topological Inversion & Clustering: The system measures the popularity of individual file connections, neutralizes noisy "God-Files" and global wrappers that distort structural separation, and routes the optimized network into sequential graph community detection and semantic clustering algorithms. 

Semantic Identification & Labeling: Once clusters are mathematically isolated, a localized LLM summarizes their high-priority contents into explicit human-readable operational domain names. 

Interactive Mapping & Refinement: The workspace displays these boundaries cleanly inside a React-driven workspace canvas, giving engineering teams the ability to visually adjust domain spaces, map execution lines, and anchor onboarding documentation directly onto code nodes. 

3. Boundary Specifications: Inputs vs. Outputs
A. The Structural Inputs
The system requires direct access to a local or cloned development repository. It consumes two primary raw data streams:

The Raw Project Directory:

Source Files: All code nodes written using JavaScript (.js, .jsx, .mjs) or TypeScript (.ts, .tsx) syntax extensions.


Manifest Declarations: System configurations and manifest lists containing package data, explicitly tracking external system frameworks, tools, or dependencies (e.g., package.json) 

Manifest Declarations: System configurations and manifest lists containing package data, explicitly tracking external system frameworks, tools, or dependencies (e.g., package.json). 

Compilation Directives: Path aliasing rules used by compilers to handle shorthand module routing paths (e.g., tsconfig.json). 

The Temporal Git Log Data Stream:

The complete, linear commit history metadata file (.git/log). The engine targets commit hashes alongside their corresponding arrays of modified file strings, capturing structural developer behaviors over time. 

B. The Structural Outputs
The processing engine outputs two clean data objects to populate the visual dashboard application:

The Comprehensive Architecture Schema (map.json):
A structured JSON schema mapping verified repository domains, nodes, and flow networks: 

{
  "project_metadata": {
    "detected_paradigm": "WEB_FRAMEWORK_NEXTJS",
    "total_nodes_indexed": 142
  },
  "clusters": [
    {
      "cluster_id": "cluster_domain_04",
      "suggested_title": "Secure Authentication Services",
      "functional_summary": "Encapsulates JWT token issuance, multi-factor credential checks, and encryption middleware layers.",
      "nodes": [
        "src/services/auth.service.ts",
        "src/middleware/jwt.verify.ts",
        "src/models/user.schema.ts"
      ]
    }
  ],
  "execution_flows": [
    {
      "flow_spine_id": "flow_auth_01",
      "origin_node": "src/app/api/auth/route.ts",
      "execution_path": [
        "src/middleware/jwt.verify.ts",
        "src/services/auth.service.ts"
      ],
      "terminal_sink": "src/models/user.schema.ts"
    }
  ]
} 

The Persisted Human-in-the-Loop Documentation Layer:
A relational output store mapping customized structural naming modifications, spatial node offsets, and markdown-rendered codebase documentation blocks against stable, path-based identifiers. 

4. Comprehensive System Requirements List 

1. Functional Requirements (FR)
FR-1.1: Automated Project Traversal: The system must autonomously walk through any target JS/TS repository root directory and index all file paths while dynamically skipping noise patterns.

FR-1.2: Workspace Boundary Isolation: The system must auto-detect Monorepo structures (Turbo, Pnpm, Lerna) and isolate workspaces as distinct sub-graphs.

FR-1.3: Multi-Signal Graph Construction: The engine must construct a directed graph layout ($G = (V, E)$) capturing both explicit file-to-file code dependencies and implicit framework configuration usage. 

FR-1.4: Dynamic Centrality Suppression: The system must automatically compute topological popularity (In-Degree) and down-weight global wrappers/god-files so they do not corrupt clustering algorithms.

FR-1.5: Hybrid Multi-Stage Clustering: The system must execute topological partitioning (Leiden) followed by vector density refinement (HDBSCAN) using text embeddings to achieve clean domain separation. 

FR-1.6: LLM-Driven Cluster Summarization: The backend must compile top-weighted files within each isolated cluster and pass them to an LLM to generate descriptive domain labels and 3-word functional titles. 

2. Technical & Architectural Constraints (NFR) 

NFR-2.1: Local Parsing Speed: Code syntax analysis must be lightning-fast and deterministic; regex parsing is barred. Concrete AST structures must be captured using Tree-sitter.  

NFR-2.2: Memory Efficiency: Code embeddings must be processed using a lightweight, open-source local vector model (e.g., all-MiniLM-L6-v2) to run efficiently on standard developer setups without requiring commercial GPU cloud configurations.

NFR-2.3: Data Persistence Schema: The state of parsed structures, weights, final clusters, user custom notes, and manual overrides must be saved inside a relational configuration layout (Postgresql) or standalone JSON schemas.  


5. Step-by-Step System Building Tasks (Sprint Plan)

Phase 1: Workspace Ingestion & Filtering Pipeline (Python Backend)

[ ] Task 1.1: File System Walk Engine: Write a Python file utility that recursively crawls a target directory path.  

[ ] Task 1.2: Monorepo & Boundary Hook: Implement a checker that reads the root file directory. If pnpm-workspace.yaml, turbo.json, or a workspaces array in package.json is found, log boundaries as macro workspace targets.

[ ] Task 1.3: Non-Source Data Suppressor: Write a strict pattern-matching utility to intercept and drop environmental, build, and static noise assets (.gitignore, .next/, dist/, *.svg, node_modules/).

[ ] Task 1.4: Paradigm Classification Hook: Code the heuristic analyzer that evaluates dependency keys inside package.json to configure the system to WEB_FRAMEWORK_NEXTJS, WEB_API_NODEJS, or PURE_LIBRARY_OR_PACKAGE states. 

Phase 2: Multi-Dimensional Feature Extraction (AST & Metadata Mining) 

[ ] Task 2.1: Tree-sitter AST Import Parser: Set up Python bindings for the Tree-sitter JavaScript/TypeScript grammars. Write a function to parse all file contents, target ImportDeclaration and ExportNamedDeclaration tokens, and map absolute internal code dependencies while bypassing native global environment blocks (console, window).  

[ ] Task 2.2: Manifest DNA Classifier: Create a JSON parser module that reads internal package.json arrays. Extract dependency names and map target files to their specific runtime framework execution layer identities (e.g., tags files using next/express as Server Layer components, files using react as Presentation Layer components).

[ ] Task 2.3: Natural Language Token Cleaner: Write a processing task that strips code keywords (const, function, return), isolates inline comments, code doc-strings, README files, and clean file names into plain-text blocks.

[ ] Task 2.4: Vector Embedding Generation: Integrate the HuggingFace sentence-transformers library locally using the all-MiniLM-L6-v2 model. Pass the compiled plain-text blocks through it to generate a 384-dimensional semantic footprint vector for every source node.

Phase 3: Network Topology Construction & Clustering Core
[ ] Task 3.1: NetworkX Directed Graph Initialization: Ingest all verified source nodes and internal AST dependencies into a NetworkX directed graph framework ($G$).

[ ] Task 3.2: Centrality Weight Penalizer: Run a pre-clustering centrality check. Compute the normalized In-Degree Centrality score for all files. For any node with an input connection score exceeding 0.15 (the 15% rule for God-files/Wrappers), drop its structural edge weight to 0.05.

[ ] Task 3.3: Leiden Algorithmic Partitioning: Feed the modified weighted NetworkX graph matrix into the cdlib or leidenalg community detection suite. Group the structural files into tight localized communities based purely on execution connection densities.  

[ ] Task 3.4: HDBSCAN Multi-Signal Refinement: For any Leiden-generated community that exceeds a threshold length of 15 files, combine its structural topology dimensions with its 384-dimensional semantic text vectors. Run HDBSCAN on this integrated matrix to automatically detect sub-clusters and partition hidden internal boundary segments cleanly.  

Phase 4: Semantic Labeling Engine & Frontend Visualization

[ ] Task 4.1: LLM Payload Compilation: For every distinct final cluster, find its top 5 core file nodes (sorted by internal dependency link weights). Package these file names, their resolved import targets, and their stripped raw comment headers into a localized prompting context.

[ ] Task 4.2: Structured LLM Completion Wrapper: Construct an API call using a deterministic localized framework setup (or OpenAI endpoint). Pass the structured context text using a prompt template requiring an architectural breakdown, a short text functional summary, and an absolute 3-word title header. Export this schema safely to map.json.

[ ] Task 4.3: Next.js ReactFlow UI Graph Canvas Implementation: Build the frontend visualization layout inside your Next.js framework. Read the map.json payload data structure. Initialize a ReactFlow canvas where parent groups render boundaries around the algorithmically generated Leiden communities.  

[ ] Task 4.4: Flow Indicator & Document Anchoring Hook: Add distinct visual visual properties (color borders, markers) marking graph execution Entry Points ($InDegree == 0$) and Terminal Node Sinks ($OutDegree == 0$). Implement an interactive sidebar panel linked to a local Postgresql API route enabling engineers to append documentation guides directly onto individual code nodes on-the-fly.  