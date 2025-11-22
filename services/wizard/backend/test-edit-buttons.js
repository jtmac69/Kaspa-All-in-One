/**
 * Test: Review Edit Buttons
 * 
 * Tests the edit button functionality in the review step
 */

const assert = require('assert');

// Mock DOM environment
class MockElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.className = '';
        this.textContent = '';
        this.children = [];
        this.attributes = {};
        this.onclick = null;
        this.parentNode = null;
        this.nextSibling = null;
    }

    querySelector(selector) {
        // Simple selector matching
        if (selector.startsWith('.')) {
            const className = selector.substring(1);
            return this.findByClass(className);
        }
        return null;
    }

    querySelectorAll(selector) {
        if (selector.startsWith('.')) {
            const className = selector.substring(1);
            // For review-section, only search direct children
            // For review-edit-btn, search recursively
            if (className === 'review-section') {
                return this.findDirectByClass(className);
            } else {
                return this.findAllByClass(className);
            }
        }
        return [];
    }

    findByClass(className) {
        if (this.className.includes(className)) {
            return this;
        }
        for (const child of this.children) {
            const found = child.findByClass(className);
            if (found) return found;
        }
        return null;
    }

    findDirectByClass(className) {
        const results = [];
        for (const child of this.children) {
            if (child.className.includes(className)) {
                results.push(child);
            }
        }
        return results;
    }

    findAllByClass(className) {
        const results = [];
        if (this.className.includes(className)) {
            results.push(this);
        }
        for (const child of this.children) {
            results.push(...child.findAllByClass(className));
        }
        return results;
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
    }

    getAttribute(name) {
        return this.attributes[name];
    }

    appendChild(child) {
        child.parentNode = this;
        if (this.children.length > 0) {
            this.children[this.children.length - 1].nextSibling = child;
        }
        this.children.push(child);
    }

    insertBefore(newNode, referenceNode) {
        newNode.parentNode = this;
        const index = this.children.indexOf(referenceNode);
        if (index >= 0) {
            this.children.splice(index, 0, newNode);
            if (index > 0) {
                this.children[index - 1].nextSibling = newNode;
            }
            newNode.nextSibling = referenceNode;
        }
    }

    get classList() {
        return {
            contains: (className) => this.className.includes(className),
            add: (className) => {
                if (!this.className.includes(className)) {
                    this.className += ` ${className}`;
                }
            },
            remove: (className) => {
                this.className = this.className.replace(className, '').trim();
            }
        };
    }
}

// Create mock document
function createMockDocument() {
    const doc = new MockElement('document');
    
    // Create review sections
    const sections = [
        { title: 'Selected Profiles', hasWarning: false },
        { title: 'Resource Requirements', hasWarning: false },
        { title: 'Network Configuration', hasWarning: false },
        { title: 'Before You Continue', hasWarning: true }
    ];

    sections.forEach(({ title, hasWarning }) => {
        const section = new MockElement('div');
        section.className = hasWarning ? 'review-section warning' : 'review-section';
        
        const titleEl = new MockElement('h3');
        titleEl.className = 'review-section-title';
        titleEl.textContent = title;
        section.appendChild(titleEl);
        
        const content = new MockElement('div');
        content.className = 'review-content';
        section.appendChild(content);
        
        doc.appendChild(section);
    });

    return doc;
}

// Simulate addEditButtons function
function addEditButtons(document) {
    const reviewSections = document.querySelectorAll('.review-section');
    let addedCount = 0;
    
    reviewSections.forEach((section) => {
        if (section.classList.contains('warning')) {
            return;
        }
        
        if (section.querySelector('.review-edit-btn')) {
            return;
        }
        
        const titleElement = section.querySelector('.review-section-title');
        if (!titleElement) {
            return;
        }
        
        const title = titleElement.textContent.trim();
        let targetStep = null;
        let buttonText = 'Edit';
        
        if (title.includes('Profile')) {
            targetStep = 'profiles';
            buttonText = 'Edit Profiles';
        } else if (title.includes('Network Configuration')) {
            targetStep = 'configure';
            buttonText = 'Edit Configuration';
        }
        // Resource Requirements section doesn't get an edit button
        
        if (targetStep) {
            const editButton = new MockElement('button');
            editButton.className = 'review-edit-btn';
            editButton.textContent = buttonText;
            editButton.setAttribute('data-target-step', targetStep);
            editButton.onclick = () => {
                console.log(`Navigate to: ${targetStep}`);
            };
            
            titleElement.parentNode.insertBefore(editButton, titleElement.nextSibling);
            addedCount++;
        }
    });
    
    return addedCount;
}

// Run tests
console.log('Running Review Edit Buttons Tests...\n');

let passed = 0;
let failed = 0;

// Test 1: Edit buttons are added to correct sections
try {
    console.log('Test 1: Edit buttons are added to correct sections');
    const doc = createMockDocument();
    const addedCount = addEditButtons(doc);
    
    assert.strictEqual(addedCount, 2, 'Should add 2 edit buttons (Profiles and Network Configuration)');
    
    const editButtons = doc.querySelectorAll('.review-edit-btn');
    assert.strictEqual(editButtons.length, 2, 'Should have 2 edit buttons in DOM');
    
    console.log('✓ Test 1 passed\n');
    passed++;
} catch (error) {
    console.error('✗ Test 1 failed:', error.message, '\n');
    failed++;
}

// Test 2: Edit buttons have correct text
try {
    console.log('Test 2: Edit buttons have correct text');
    const doc = createMockDocument();
    addEditButtons(doc);
    
    const sections = doc.querySelectorAll('.review-section');
    const profileSection = sections[0];
    const networkSection = sections[2];
    
    const profileButton = profileSection.querySelector('.review-edit-btn');
    const networkButton = networkSection.querySelector('.review-edit-btn');
    
    assert.strictEqual(profileButton.textContent, 'Edit Profiles', 'Profile section should have "Edit Profiles" button');
    assert.strictEqual(networkButton.textContent, 'Edit Configuration', 'Network section should have "Edit Configuration" button');
    
    console.log('✓ Test 2 passed\n');
    passed++;
} catch (error) {
    console.error('✗ Test 2 failed:', error.message, '\n');
    failed++;
}

// Test 3: Edit buttons have correct target steps
try {
    console.log('Test 3: Edit buttons have correct target steps');
    const doc = createMockDocument();
    addEditButtons(doc);
    
    const sections = doc.querySelectorAll('.review-section');
    const profileSection = sections[0];
    const networkSection = sections[2];
    
    const profileButton = profileSection.querySelector('.review-edit-btn');
    const networkButton = networkSection.querySelector('.review-edit-btn');
    
    assert.strictEqual(profileButton.getAttribute('data-target-step'), 'profiles', 'Profile button should target "profiles" step');
    assert.strictEqual(networkButton.getAttribute('data-target-step'), 'configure', 'Network button should target "configure" step');
    
    console.log('✓ Test 3 passed\n');
    passed++;
} catch (error) {
    console.error('✗ Test 3 failed:', error.message, '\n');
    failed++;
}

// Test 4: Warning section does not get edit button
try {
    console.log('Test 4: Warning section does not get edit button');
    const doc = createMockDocument();
    addEditButtons(doc);
    
    const sections = doc.querySelectorAll('.review-section');
    const warningSection = sections[3];
    
    const editButton = warningSection.querySelector('.review-edit-btn');
    assert.strictEqual(editButton, null, 'Warning section should not have edit button');
    
    console.log('✓ Test 4 passed\n');
    passed++;
} catch (error) {
    console.error('✗ Test 4 failed:', error.message, '\n');
    failed++;
}

// Test 5: Edit buttons are not duplicated
try {
    console.log('Test 5: Edit buttons are not duplicated');
    const doc = createMockDocument();
    
    // Add buttons twice
    const firstCount = addEditButtons(doc);
    const secondCount = addEditButtons(doc);
    
    assert.strictEqual(firstCount, 2, 'First call should add 2 buttons');
    assert.strictEqual(secondCount, 0, 'Second call should add 0 buttons (already exist)');
    
    const editButtons = doc.querySelectorAll('.review-edit-btn');
    assert.strictEqual(editButtons.length, 2, 'Should still have only 2 edit buttons');
    
    console.log('✓ Test 5 passed\n');
    passed++;
} catch (error) {
    console.error('✗ Test 5 failed:', error.message, '\n');
    failed++;
}

// Test 6: Edit buttons have onclick handlers
try {
    console.log('Test 6: Edit buttons have onclick handlers');
    const doc = createMockDocument();
    addEditButtons(doc);
    
    const editButtons = doc.querySelectorAll('.review-edit-btn');
    
    editButtons.forEach((button, index) => {
        assert.notStrictEqual(button.onclick, null, `Button ${index + 1} should have onclick handler`);
        assert.strictEqual(typeof button.onclick, 'function', `Button ${index + 1} onclick should be a function`);
    });
    
    console.log('✓ Test 6 passed\n');
    passed++;
} catch (error) {
    console.error('✗ Test 6 failed:', error.message, '\n');
    failed++;
}

// Summary
console.log('='.repeat(50));
console.log(`Tests completed: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
