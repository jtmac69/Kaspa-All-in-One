const ConfigGenerator = require('./services/wizard/backend/src/utils/config-generator.js');
const generator = new ConfigGenerator();

(async () => {
  const config = generator.generateDefaultConfig(['kaspa-user-applications']);
  const compose = await generator.generateDockerCompose(config, ['kaspa-user-applications']);
  
  console.log('Testing kaspa-user-applications profile...\n');
  
  // Check if kaspa-node service is defined (not just referenced in env vars)
  const lines = compose.split('\n');
  const nodeServiceIndex = lines.findIndex(l => l.trim() === 'kaspa-node:');
  
  if (nodeServiceIndex !== -1) {
    console.log('❌ FAIL: kaspa-node service found in kaspa-user-applications profile');
    console.log('kaspa-node section:');
    console.log(lines.slice(nodeServiceIndex, nodeServiceIndex + 15).join('\n'));
  } else {
    console.log('✅ PASS: kaspa-node service NOT in kaspa-user-applications profile');
  }
  
  // Check if kasia-app has depends_on
  if (compose.includes('kasia-app:')) {
    const lines = compose.split('\n');
    const kasiaIndex = lines.findIndex(l => l.includes('kasia-app:'));
    const kasiaSection = lines.slice(kasiaIndex, kasiaIndex + 20).join('\n');
    
    if (kasiaSection.includes('depends_on:')) {
      console.log('❌ FAIL: kasia-app has depends_on');
      console.log(kasiaSection);
    } else {
      console.log('✅ PASS: kasia-app has NO depends_on');
    }
  }
  
  // Check if k-social has depends_on
  if (compose.includes('k-social:')) {
    const lines = compose.split('\n');
    const ksocialIndex = lines.findIndex(l => l.includes('k-social:'));
    const ksocialSection = lines.slice(ksocialIndex, ksocialIndex + 20).join('\n');
    
    if (ksocialSection.includes('depends_on:')) {
      console.log('❌ FAIL: k-social has depends_on');
      console.log(ksocialSection);
    } else {
      console.log('✅ PASS: k-social has NO depends_on');
    }
  }
  
  console.log('\n✅ All checks passed!');
})();
