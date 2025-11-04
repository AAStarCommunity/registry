#!/usr/bin/env node
/**
 * Configuration Checker
 *
 * Verifies that all GTokenStaking addresses are correctly configured
 */

const fs = require('fs');
const path = require('path');

const OLD_ADDRESS = '0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2';
const NEW_ADDRESS = '0x199402b3F213A233e89585957F86A07ED1e1cD67';

const filesToCheck = [
  'src/config/networkConfig.ts',
  'src/pages/operator/deploy-v2/steps/Step4_DeployResources.tsx',
  'src/pages/operator/deploy-v2/steps/Step6_RegisterRegistry_v2.tsx',
  'src/pages/operator/deploy-v2/components/StakeToSuperPaymaster.tsx',
  'src/pages/resources/GetSBT.tsx',
  'src/pages/resources/GetGToken.tsx',
  '.env.example',
];

console.log('🔍 Checking for old GTokenStaking address...\n');

let foundOldAddress = false;

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} - NOT FOUND`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  if (content.includes(OLD_ADDRESS)) {
    console.log(`❌ ${file} - STILL CONTAINS OLD ADDRESS`);
    foundOldAddress = true;

    // Show line numbers
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes(OLD_ADDRESS)) {
        console.log(`   Line ${index + 1}: ${line.trim()}`);
      }
    });
  } else if (content.includes(NEW_ADDRESS)) {
    console.log(`✅ ${file} - Uses new address`);
  } else {
    console.log(`ℹ️  ${file} - No GTokenStaking address found`);
  }
});

console.log('\n📊 Summary:');
console.log(`Old address (deprecated): ${OLD_ADDRESS}`);
console.log(`New address (current):    ${NEW_ADDRESS}`);

if (foundOldAddress) {
  console.log('\n❌ ERROR: Old addresses found! Please update the files above.');
  process.exit(1);
} else {
  console.log('\n✅ All files use the correct address!');
  console.log('\n💡 If you still see the old address in browser:');
  console.log('   1. Stop dev server (Ctrl+C)');
  console.log('   2. Clear Vite cache: rm -rf node_modules/.vite');
  console.log('   3. Restart: npm run dev');
  console.log('   4. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)');
}
