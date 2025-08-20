const fs = require('fs');
const path = require('path');

// Path to the missing client reference manifest
const manifestPath = path.join(process.cwd(), '.next', 'server', 'app', '(admin)', 'page_client-reference-manifest.js');

// Template manifest content based on existing manifests
const manifestContent = `self.__RSC_MANIFEST={
  "__ssr_module_mapping__": {},
  "__edge_ssr_module_mapping__": {},
  "__entry_css_files__": {},
  "__client_module_mapping__": {},
  "__client_css_files__": {}
};
//# sourceMappingURL=page_client-reference-manifest.js.map`;

// Create the manifest file if it doesn't exist
if (!fs.existsSync(manifestPath)) {
  console.log('Creating missing client reference manifest for admin page...');
  fs.writeFileSync(manifestPath, manifestContent, 'utf8');
  console.log('Client reference manifest created successfully.');
} else {
  console.log('Client reference manifest already exists.');
}