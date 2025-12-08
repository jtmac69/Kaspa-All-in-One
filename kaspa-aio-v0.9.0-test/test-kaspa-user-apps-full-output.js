const ConfigGenerator = require('./services/wizard/backend/src/utils/config-generator.js');
const generator = new ConfigGenerator();

(async () => {
  const config = generator.generateDefaultConfig(['kaspa-user-applications']);
  const compose = await generator.generateDockerCompose(config, ['kaspa-user-applications']);
  
  console.log('=== FULL DOCKER-COMPOSE OUTPUT ===\n');
  console.log(compose);
})();
