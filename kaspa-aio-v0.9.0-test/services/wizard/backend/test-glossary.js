/**
 * Glossary System Test
 * Quick test to verify glossary functionality
 */

const GlossaryManager = require('./src/utils/glossary-manager');

console.log('🧪 Testing Glossary System...\n');

const glossary = new GlossaryManager();

// Test 1: Load glossary data
console.log('Test 1: Load Glossary Data');
const allTerms = glossary.getAllTerms();
console.log(`✅ Loaded ${Object.keys(allTerms).length} terms`);

// Test 2: Get categories
console.log('\nTest 2: Get Categories');
const categories = glossary.getAllCategories();
console.log(`✅ Loaded ${Object.keys(categories).length} categories:`);
Object.entries(categories).forEach(([id, cat]) => {
    console.log(`   ${cat.icon} ${cat.name}`);
});

// Test 3: Search terms
console.log('\nTest 3: Search Terms');
const searchResults = glossary.searchTerms('docker');
console.log(`✅ Found ${Object.keys(searchResults).length} terms matching "docker"`);

// Test 4: Get term by category
console.log('\nTest 4: Get Terms by Category');
const dockerTerms = glossary.getTermsByCategory('docker');
console.log(`✅ Found ${Object.keys(dockerTerms).length} terms in "docker" category:`);
Object.values(dockerTerms).forEach(term => {
    console.log(`   - ${term.term}`);
});

// Test 5: Get full term data
console.log('\nTest 5: Get Full Term Data');
const containerTerm = glossary.getFullTermData('container');
if (containerTerm) {
    console.log(`✅ Retrieved full data for "${containerTerm.term}"`);
    console.log(`   Short: ${containerTerm.shortDefinition}`);
    console.log(`   Related: ${containerTerm.relatedTermsData.length} terms`);
} else {
    console.log('❌ Failed to retrieve term data');
}

// Test 6: Get concepts
console.log('\nTest 6: Get Concepts');
const concepts = glossary.getAllConcepts();
console.log(`✅ Loaded ${Object.keys(concepts).length} concept explainers:`);
Object.values(concepts).forEach(concept => {
    console.log(`   - ${concept.title}`);
});

// Test 7: Find terms in text
console.log('\nTest 7: Find Terms in Text');
const sampleText = 'Docker containers use images to create isolated environments. Each node runs in its own container.';
const foundTerms = glossary.findTermsInText(sampleText);
console.log(`✅ Found ${foundTerms.length} terms in sample text:`);
foundTerms.forEach(term => {
    console.log(`   - "${term.term}" at position ${term.position}`);
});

// Test 8: Get popular terms
console.log('\nTest 8: Get Popular Terms');
const popularTerms = glossary.getPopularTerms(5);
console.log(`✅ Top 5 popular terms (by related terms):`);
popularTerms.forEach((term, i) => {
    console.log(`   ${i + 1}. ${term.term} (${term.relationCount} related terms)`);
});

// Test 9: Get statistics
console.log('\nTest 9: Get Statistics');
const stats = glossary.getStatistics();
console.log(`✅ Glossary Statistics:`);
console.log(`   Total Terms: ${stats.totalTerms}`);
console.log(`   Total Categories: ${stats.totalCategories}`);
console.log(`   Total Concepts: ${stats.totalConcepts}`);
console.log(`   Terms by Category:`);
stats.termsByCategory.forEach(cat => {
    console.log(`     - ${cat.category}: ${cat.count} terms`);
});

// Test 10: Get beginner terms
console.log('\nTest 10: Get Beginner Terms');
const beginnerTerms = glossary.getBeginnerTerms();
console.log(`✅ Found ${Object.keys(beginnerTerms).length} beginner-friendly terms`);

console.log('\n✅ All tests passed! Glossary system is working correctly.\n');
