#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Funkcija za konvertovanje require u import
function convertRequireToImport(content) {
  // CommonJS requires u ES imports
  content = content.replace(
    /const\s+(.+?)\s*=\s*require\(["'](.+?)["']\);/g,
    (match, imports, module) => {
      if (imports.includes("{")) {
        return `import ${imports} from "${module}.js";`;
      } else {
        return `import ${imports} from "${module}.js";`;
      }
    }
  );

  // module.exports u export default
  content = content.replace(
    /module\.exports\s*=\s*(.+?);/g,
    "export default $1;"
  );

  return content;
}

// Lista fajlova za konvertovanje
const filesToConvert = [
  "backend/routes/posts.js",
  "backend/routes/users.js",
  "backend/routes/categories.js",
  "backend/routes/cemeteries.js",
  "backend/config/database.js",
  "backend/config/auth.js",
  "backend/middleware/validation.js",
  "backend/middleware/auth.js",
];

console.log("🚀 Konvertovanje na ES Modules...\n");

filesToConvert.forEach((filePath) => {
  const fullPath = path.join(__dirname, filePath);

  if (fs.existsSync(fullPath)) {
    console.log(`✅ Konvertujem: ${filePath}`);

    let content = fs.readFileSync(fullPath, "utf8");
    const originalContent = content;

    content = convertRequireToImport(content);

    // Specifične zamene za različite fajlove
    if (filePath.includes("database.js")) {
      content = content.replace(
        /require\(["']mysql2\/promise["']\)/g,
        "mysql2/promise"
      );
      content = content.replace(/const mysql = /, "import mysql from ");
    }

    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content);
      console.log(`   💾 Ažuriran!`);
    } else {
      console.log(`   ⏭️  Nema potrebe za ažuriranjem`);
    }
  } else {
    console.log(`❌ Fajl ne postoji: ${filePath}`);
  }
});

console.log("\n✨ Konvertovanje završeno!");
console.log("📝 Sada možete pokrenuti: npm run dev");
