# Glossary System - Usage Examples

## Quick Start

### 1. Access the Glossary

**Option A: Floating Help Button**
- Look for the blue question mark button in the bottom-right corner
- Click it to open the help modal
- Choose from three tabs: Glossary, Learn Concepts, or Popular Terms

**Option B: Direct Function Call**
```javascript
// From anywhere in the wizard
showGlossaryModal();
```

### 2. Search for a Term

**In the Help Modal**:
1. Click the floating help button
2. Type in the search box (e.g., "docker")
3. Results appear instantly

**Programmatically**:
```javascript
const results = await glossarySystem.searchTerms('docker');
// Returns: { docker: {...}, docker-compose: {...}, ... }
```

### 3. Browse by Category

**In the Help Modal**:
1. Click the floating help button
2. Click a category button (e.g., "📦 Docker & Containers")
3. See all terms in that category

**Programmatically**:
```javascript
const dockerTerms = await glossarySystem.getTermsByCategory('docker');
```

## Common Use Cases

### Use Case 1: Show Term Definition

**Scenario**: User clicks on a term card

```javascript
// Show full term modal
glossarySystem.showTermModal('container');
```

**What the user sees**:
- Term name: "Container"
- Category: "📦 Docker & Containers"
- Quick definition
- Plain language explanation
- Real-world analogy
- Examples
- Technical details
- Related terms (clickable)
- "Learn More" link

### Use Case 2: Show Concept Explainer

**Scenario**: User wants to learn about a complex topic

```javascript
// Show concept modal
glossarySystem.showConceptModal('how-containers-work');
```

**What the user sees**:
- Concept title: "How Do Containers Work?"
- Summary
- Multiple sections:
  - The Problem They Solve
  - How They Work
  - Benefits
  - Docker's Role
- Related terms

### Use Case 3: Add Tooltips to Content

**Scenario**: You have a paragraph with technical terms

```javascript
// HTML
<div id="my-content">
  Docker containers use images to create isolated environments.
  Each node runs in its own container.
</div>

// JavaScript
const element = document.getElementById('my-content');
await glossarySystem.addTooltipsToElement(element);
```

**Result**: Terms like "Docker", "container", "image", and "node" are automatically highlighted with tooltips.

### Use Case 4: Get Popular Terms

**Scenario**: Show most helpful terms to new users

```javascript
const popularTerms = await fetch('/api/glossary/popular?limit=5')
  .then(r => r.json());

// Returns top 5 terms by number of related terms
```

### Use Case 5: Get Beginner-Friendly Terms

**Scenario**: Show terms for non-technical users

```javascript
const beginnerTerms = await fetch('/api/glossary/beginner')
  .then(r => r.json());

// Returns terms from docker, blockchain, and hardware categories
```

## API Examples

### Get All Terms

```bash
curl http://localhost:3000/api/glossary/terms
```

```json
{
  "success": true,
  "terms": {
    "container": {
      "term": "Container",
      "category": "docker",
      "shortDefinition": "A lightweight, standalone package...",
      "plainLanguage": "Think of a container like a lunch box...",
      "analogy": "Like a shipping container...",
      "examples": ["The Kaspa node runs in a container", ...],
      "relatedTerms": ["docker", "image", "volume"]
    },
    ...
  },
  "count": 20
}
```

### Search Terms

```bash
curl http://localhost:3000/api/glossary/terms?search=docker
```

```json
{
  "success": true,
  "terms": {
    "docker": {...},
    "docker-compose": {...},
    "container": {...}
  },
  "count": 3
}
```

### Filter by Category

```bash
curl http://localhost:3000/api/glossary/terms?category=blockchain
```

```json
{
  "success": true,
  "terms": {
    "node": {...},
    "blockchain": {...},
    "indexer": {...},
    "sync": {...}
  },
  "count": 4
}
```

### Get Specific Term

```bash
curl http://localhost:3000/api/glossary/terms/container
```

```json
{
  "success": true,
  "term": {
    "id": "container",
    "term": "Container",
    "category": "docker",
    "shortDefinition": "...",
    "plainLanguage": "...",
    "analogy": "...",
    "technicalDetails": "...",
    "examples": [...],
    "relatedTerms": ["docker", "image", "volume"],
    "relatedTermsData": [
      { "id": "docker", "term": "Docker", ... },
      { "id": "image", "term": "Image", ... },
      { "id": "volume", "term": "Volume", ... }
    ],
    "categoryData": {
      "name": "Docker & Containers",
      "description": "...",
      "icon": "📦"
    }
  }
}
```

### Get All Categories

```bash
curl http://localhost:3000/api/glossary/categories
```

```json
{
  "success": true,
  "categories": {
    "docker": {
      "name": "Docker & Containers",
      "description": "Understanding containers and how Docker works",
      "icon": "📦"
    },
    "blockchain": {
      "name": "Blockchain Basics",
      "description": "Core blockchain concepts and how Kaspa works",
      "icon": "⛓️"
    },
    ...
  }
}
```

### Get All Concepts

```bash
curl http://localhost:3000/api/glossary/concepts
```

```json
{
  "success": true,
  "concepts": {
    "why-run-node": {
      "title": "Why Run Your Own Node?",
      "category": "blockchain",
      "summary": "Running your own node gives you independence...",
      "sections": [
        {
          "heading": "Independence",
          "content": "When you run your own node..."
        },
        ...
      ],
      "relatedTerms": ["node", "blockchain", "p2p"]
    },
    ...
  },
  "count": 5
}
```

### Find Terms in Text

```bash
curl -X POST http://localhost:3000/api/glossary/find-in-text \
  -H "Content-Type: application/json" \
  -d '{"text": "Docker containers use images to create isolated environments."}'
```

```json
{
  "success": true,
  "terms": [
    {
      "id": "docker",
      "term": "Docker",
      "position": 0,
      "length": 6,
      "shortDefinition": "A platform for running containers..."
    },
    {
      "id": "container",
      "term": "container",
      "position": 7,
      "length": 9,
      "shortDefinition": "A lightweight, standalone package..."
    },
    {
      "id": "image",
      "term": "image",
      "position": 22,
      "length": 5,
      "shortDefinition": "A template or blueprint..."
    }
  ],
  "count": 3
}
```

### Get Popular Terms

```bash
curl http://localhost:3000/api/glossary/popular?limit=5
```

```json
{
  "success": true,
  "terms": [
    {
      "id": "node",
      "term": "Node",
      "shortDefinition": "...",
      "relationCount": 4
    },
    {
      "id": "blockchain",
      "term": "Blockchain",
      "shortDefinition": "...",
      "relationCount": 4
    },
    ...
  ]
}
```

### Get Statistics

```bash
curl http://localhost:3000/api/glossary/statistics
```

```json
{
  "success": true,
  "statistics": {
    "totalTerms": 20,
    "totalCategories": 5,
    "totalConcepts": 5,
    "termsByCategory": [
      { "category": "Docker & Containers", "count": 5 },
      { "category": "Blockchain Basics", "count": 4 },
      { "category": "Technical Terms", "count": 6 },
      { "category": "Hardware & Resources", "count": 4 },
      { "category": "System Concepts", "count": 1 }
    ],
    "conceptsByCategory": [
      { "category": "Docker & Containers", "count": 1 },
      { "category": "Blockchain Basics", "count": 2 },
      { "category": "System Concepts", "count": 1 },
      { "category": "Hardware & Resources", "count": 1 }
    ]
  }
}
```

## Integration Examples

### Example 1: Add Glossary to Profile Description

```javascript
// When rendering profile descriptions
async function renderProfileDescription(profileId) {
  const description = document.getElementById(`profile-${profileId}-description`);
  
  // Add tooltips to technical terms
  await glossarySystem.addTooltipsToElement(description);
}
```

### Example 2: Show Help for Specific Step

```javascript
// Add help button to each wizard step
function addStepHelp(stepId, conceptId) {
  const helpButton = document.createElement('button');
  helpButton.textContent = 'Learn More';
  helpButton.onclick = () => glossarySystem.showConceptModal(conceptId);
  
  document.getElementById(stepId).appendChild(helpButton);
}

// Usage
addStepHelp('step-profiles', 'understanding-profiles');
addStepHelp('step-configure', 'resource-requirements');
```

### Example 3: Contextual Help in Error Messages

```javascript
// Show relevant terms when errors occur
function showError(errorType, message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  
  // Add glossary link for technical terms
  if (errorType === 'docker') {
    const helpLink = document.createElement('a');
    helpLink.textContent = 'What is Docker?';
    helpLink.onclick = () => glossarySystem.showTermModal('docker');
    errorDiv.appendChild(helpLink);
  }
  
  document.body.appendChild(errorDiv);
}
```

### Example 4: Onboarding Tour with Glossary

```javascript
// Show glossary terms during onboarding
const tourSteps = [
  {
    title: 'Welcome to Profiles',
    content: 'Choose which services to run',
    glossaryTerm: 'profile'
  },
  {
    title: 'Understanding Containers',
    content: 'Each service runs in a container',
    glossaryTerm: 'container'
  }
];

function showTourStep(step) {
  // Show tour content
  showTourContent(step.title, step.content);
  
  // Add glossary link
  const learnMore = document.createElement('button');
  learnMore.textContent = 'Learn More';
  learnMore.onclick = () => glossarySystem.showTermModal(step.glossaryTerm);
  
  document.getElementById('tour-actions').appendChild(learnMore);
}
```

## Styling Examples

### Custom Tooltip Styling

```css
/* Override default tooltip colors */
.glossary-tooltip {
  background: #2c3e50;
  color: #ecf0f1;
  border: 2px solid #3498db;
}

.glossary-tooltip-term {
  color: #3498db;
}
```

### Custom Modal Styling

```css
/* Make modals larger */
.glossary-modal-content {
  max-width: 900px;
}

/* Custom category colors */
.glossary-modal-category[data-category="docker"] {
  background: rgba(52, 152, 219, 0.1);
  color: #3498db;
}

.glossary-modal-category[data-category="blockchain"] {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}
```

### Custom Card Styling

```css
/* Add hover effects to cards */
.glossary-card {
  transition: all 0.3s ease;
}

.glossary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

/* Add category-specific colors */
.glossary-card[data-category="docker"] {
  border-left: 4px solid #3498db;
}

.glossary-card[data-category="blockchain"] {
  border-left: 4px solid #2ecc71;
}
```

## Testing Examples

### Test Term Retrieval

```javascript
// Test getting a term
async function testGetTerm() {
  const term = await glossarySystem.getTermData('container');
  console.assert(term !== null, 'Term should exist');
  console.assert(term.term === 'Container', 'Term name should match');
  console.assert(term.category === 'docker', 'Category should match');
  console.log('✅ Term retrieval test passed');
}
```

### Test Search

```javascript
// Test search functionality
async function testSearch() {
  const results = await glossarySystem.searchTerms('docker');
  console.assert(Object.keys(results).length > 0, 'Should find results');
  console.assert('docker' in results, 'Should include docker term');
  console.log('✅ Search test passed');
}
```

### Test Auto-Detection

```javascript
// Test term detection in text
async function testAutoDetection() {
  const text = 'Docker containers use images';
  const response = await fetch('/api/glossary/find-in-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  const data = await response.json();
  
  console.assert(data.success, 'API should succeed');
  console.assert(data.terms.length >= 3, 'Should find at least 3 terms');
  console.log('✅ Auto-detection test passed');
}
```

## Troubleshooting Examples

### Debug: Terms Not Showing

```javascript
// Check if glossary is initialized
console.log('Initialized:', glossarySystem.initialized);

// Check if terms are loaded
console.log('Terms loaded:', Object.keys(glossarySystem.terms).length);

// Force reload
await glossarySystem.loadTerms();
```

### Debug: Tooltips Not Appearing

```javascript
// Check if element has content
const element = document.getElementById('my-content');
console.log('Element text:', element.textContent);

// Check if terms are found
const response = await fetch('/api/glossary/find-in-text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: element.textContent })
});
const data = await response.json();
console.log('Terms found:', data.terms);

// Manually add tooltips
await glossarySystem.addTooltipsToElement(element);
```

### Debug: Modal Not Opening

```javascript
// Check if term exists
const termId = 'container';
const term = await glossarySystem.getTermData(termId);
console.log('Term exists:', term !== null);

// Check for JavaScript errors
console.log('Checking for errors...');
try {
  await glossarySystem.showTermModal(termId);
} catch (error) {
  console.error('Error showing modal:', error);
}
```

## Best Practices

### 1. Initialize Early
```javascript
// Initialize glossary on page load
document.addEventListener('DOMContentLoaded', async () => {
  await glossarySystem.initialize();
  console.log('Glossary ready');
});
```

### 2. Use Tooltips Sparingly
```javascript
// Only add tooltips to main content, not UI elements
const mainContent = document.querySelector('.wizard-step.active .step-content');
await glossarySystem.addTooltipsToElement(mainContent);
```

### 3. Provide Context
```javascript
// When showing a term, provide context
function showTermWithContext(termId, context) {
  // Show the term
  glossarySystem.showTermModal(termId);
  
  // Log context for analytics
  console.log(`User viewed ${termId} from ${context}`);
}
```

### 4. Handle Errors Gracefully
```javascript
// Always handle API errors
async function safeGetTerm(termId) {
  try {
    return await glossarySystem.getTermData(termId);
  } catch (error) {
    console.error('Error getting term:', error);
    return null;
  }
}
```

### 5. Cache Results
```javascript
// Cache search results to avoid repeated API calls
const searchCache = new Map();

async function cachedSearch(query) {
  if (searchCache.has(query)) {
    return searchCache.get(query);
  }
  
  const results = await glossarySystem.searchTerms(query);
  searchCache.set(query, results);
  return results;
}
```

## Summary

The glossary system provides multiple ways to access and display technical terms:

1. **Floating Help Button**: Always accessible, one-click access
2. **Inline Tooltips**: Automatic term detection and explanation
3. **Search Interface**: Find any term quickly
4. **Category Filters**: Browse by topic
5. **Concept Explainers**: Deep dives into complex topics
6. **API Access**: Programmatic access to all data

Use these examples as a starting point for integrating the glossary into your wizard!
