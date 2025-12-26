# Interactive Glossary & Education - Quick Reference

## Overview

The Interactive Glossary & Education system provides comprehensive, plain-language explanations of technical terms throughout the wizard. It includes tooltips, a searchable glossary page, and concept explainer modals.

## Features

### 1. Glossary Database
- **30+ technical terms** with plain language definitions
- **5 categories**: Docker & Containers, Blockchain Basics, Technical Terms, Hardware & Resources, System Concepts
- **6 concept explainers**: Why Run Your Own Node, How Containers Work, What Is an Indexer, Understanding Profiles, Resource Requirements
- Each term includes:
  - Short definition
  - Plain language explanation
  - Real-world analogy
  - Examples
  - Technical details
  - Related terms
  - External learning resources

### 2. Tooltip System
- **Inline term highlighting**: Technical terms automatically highlighted with dotted underline
- **Hover tooltips**: Quick definitions appear on hover
- **Click for more**: Click any term to open full modal with detailed explanation
- **Auto-detection**: System automatically finds and links terms in text

### 3. Glossary Page
- **Searchable**: Real-time search across all terms
- **Category filters**: Filter by Docker, Blockchain, Technical, Hardware, System
- **Card-based layout**: Easy-to-scan grid of term cards
- **Responsive design**: Works on mobile, tablet, and desktop

### 4. Concept Explainer Modals
- **Deep dives**: Multi-section explanations of complex concepts
- **Plain language**: 8th grade reading level
- **Real-world analogies**: Relatable comparisons
- **Related terms**: Links to related glossary terms

### 5. Floating Help Button
- **Always accessible**: Fixed button in bottom-right corner
- **Quick access**: One click to open help modal
- **Three tabs**: Glossary, Learn Concepts, Popular Terms

## API Endpoints

### Terms
- `GET /api/glossary/terms` - Get all terms
- `GET /api/glossary/terms?search=query` - Search terms
- `GET /api/glossary/terms?category=docker` - Filter by category
- `GET /api/glossary/terms/:id` - Get full term data
- `GET /api/glossary/terms/:id/tooltip` - Get tooltip data

### Categories
- `GET /api/glossary/categories` - Get all categories

### Concepts
- `GET /api/glossary/concepts` - Get all concepts
- `GET /api/glossary/concepts?category=blockchain` - Filter by category
- `GET /api/glossary/concepts/:id` - Get concept explainer

### Utilities
- `POST /api/glossary/find-in-text` - Find terms in text
- `GET /api/glossary/popular` - Get popular terms
- `GET /api/glossary/beginner` - Get beginner-friendly terms
- `GET /api/glossary/statistics` - Get glossary statistics
- `GET /api/glossary/export` - Export entire glossary

## Usage Examples

### 1. Show Glossary Modal
```javascript
// From anywhere in the wizard
showGlossaryModal();
```

### 2. Show Specific Term
```javascript
// Show term modal directly
glossarySystem.showTermModal('container');
```

### 3. Show Concept Explainer
```javascript
// Show concept modal
glossarySystem.showConceptModal('how-containers-work');
```

### 4. Add Tooltips to Content
```javascript
// Automatically add tooltips to an element
const element = document.getElementById('my-content');
await glossarySystem.addTooltipsToElement(element);
```

### 5. Search Terms
```javascript
// Search for terms
const results = await glossarySystem.searchTerms('docker');
```

## Glossary Terms

### Docker & Containers (📦)
- Container
- Docker
- Docker Compose
- Image
- Volume

### Blockchain Basics (⛓️)
- Node
- Blockchain
- Indexer
- Sync

### Technical Terms (🔧)
- RPC (Remote Procedure Call)
- P2P (Peer-to-Peer)
- Port
- Database
- TimescaleDB
- API

### Hardware & Resources (💻)
- RAM (Memory)
- CPU (Processor)
- Disk Space
- SSD

### System Concepts (⚙️)
- Profile

## Concept Explainers

1. **Why Run Your Own Node?**
   - Independence, Privacy, Network Security, Development

2. **How Do Containers Work?**
   - The Problem They Solve, How They Work, Benefits, Docker's Role

3. **What Is an Indexer?**
   - The Problem, The Solution, Different Types, Why You Need One

4. **Understanding Profiles**
   - What Are Profiles, Core/Explorer/Production, Mixing Profiles

5. **Understanding Resource Requirements**
   - Why Resources Matter, RAM, CPU, Disk Space, Recommendations

6. **What Is a Container?**
   - Detailed explanation with analogies and examples

## File Structure

```
services/wizard/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   └── glossary.js          # API endpoints
│   │   ├── data/
│   │   │   └── glossary-content.json # Glossary database
│   │   └── utils/
│   │       └── glossary-manager.js   # Business logic
│   └── server.js                     # Route registration
└── frontend/
    └── public/
        ├── scripts/
        │   ├── glossary.js           # Frontend logic
        │   └── wizard.js             # Integration
        └── styles/
            └── wizard.css            # Glossary styles
```

## Styling

### CSS Classes
- `.glossary-term` - Inline term with tooltip
- `.glossary-tooltip` - Tooltip popup
- `.glossary-modal` - Term detail modal
- `.concept-modal` - Concept explainer modal
- `.glossary-page` - Full glossary page
- `.glossary-card` - Term card
- `.floating-help-button` - Help button

### Color Scheme
- Primary: `#70C7BA` (Kaspa teal)
- Hover: `#5AB5A8`
- Background: Adapts to light/dark mode
- Borders: `var(--border-color)`

## Best Practices

### 1. Adding New Terms
1. Add term to `glossary-content.json`
2. Include all required fields (term, category, shortDefinition, plainLanguage, analogy)
3. Add examples and related terms
4. Test tooltip and modal display

### 2. Writing Definitions
- Use 8th grade reading level
- Start with short definition (1 sentence)
- Expand in plain language (2-3 sentences)
- Include real-world analogy
- Provide 3-5 concrete examples

### 3. Creating Concept Explainers
- Break into 3-5 sections
- Each section: heading + 2-3 paragraphs
- Use progressive disclosure (simple → complex)
- Link to related terms

### 4. Performance
- Glossary data loaded once on page load
- Tooltips created on demand
- Modals created dynamically
- Search debounced for performance

## Accessibility

- **Keyboard navigation**: All modals and buttons keyboard accessible
- **Screen readers**: Proper ARIA labels and semantic HTML
- **Color contrast**: WCAG AA compliant
- **Focus management**: Focus trapped in modals
- **Tooltips**: Accessible via keyboard (focus) and mouse (hover)

## Mobile Optimization

- **Responsive grid**: 1 column on mobile, 2-3 on tablet/desktop
- **Touch-friendly**: Large tap targets (48px minimum)
- **Scrollable modals**: Full-height modals on mobile
- **Simplified tooltips**: Tap to show, tap outside to hide

## Future Enhancements

1. **Video integration**: Link terms to video tutorials
2. **Interactive diagrams**: Visual explanations
3. **Progress tracking**: Mark terms as "learned"
4. **Personalization**: Suggest terms based on selected profile
5. **Multi-language**: Translations for international users
6. **Offline support**: Cache glossary for offline access

## Testing

### Manual Testing
1. Open wizard
2. Click floating help button (bottom-right)
3. Test search functionality
4. Test category filters
5. Click term cards to open modals
6. Test concept explainers
7. Verify tooltips on hover
8. Test responsive design (resize browser)

### API Testing
```bash
# Test terms endpoint
curl http://localhost:3000/api/glossary/terms

# Test search
curl http://localhost:3000/api/glossary/terms?search=docker

# Test category filter
curl http://localhost:3000/api/glossary/terms?category=blockchain

# Test specific term
curl http://localhost:3000/api/glossary/terms/container

# Test concepts
curl http://localhost:3000/api/glossary/concepts

# Test popular terms
curl http://localhost:3000/api/glossary/popular
```

## Troubleshooting

### Terms not showing in search
- Check `glossary-content.json` syntax
- Verify term has required fields
- Check browser console for errors

### Tooltips not appearing
- Ensure `glossary.js` is loaded
- Check `glossarySystem.initialize()` was called
- Verify element has text content

### Modal not opening
- Check browser console for errors
- Verify term ID exists in database
- Check z-index conflicts

### Styling issues
- Verify `wizard.css` is loaded
- Check CSS variable definitions
- Test in different browsers

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API endpoints are responding
3. Test with different browsers
4. Check network tab for failed requests
5. Review glossary-content.json for syntax errors

## Summary

The Interactive Glossary & Education system provides comprehensive, accessible, plain-language explanations of technical terms throughout the wizard. It includes 30+ terms, 6 concept explainers, searchable interface, tooltips, and modals - all designed to help non-technical users understand blockchain and Docker concepts.
