import bcrypt from 'bcrypt';
import { executeQuery } from './config/database.js';

async function changeAdminPassword() {
  try {
    const newPassword = 'admin1234';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update admin user password
    const result = await executeQuery(
      "UPDATE users SET password_hash = ? WHERE role = 'admin'",
      [hashedPassword]
    );
    
    console.log('✅ Admin password successfully changed to: admin1234');
    console.log(`Updated ${result.affectedRows} user(s)`);
    
    // Show admin users
    const admins = await executeQuery(
      "SELECT id, username, email, role FROM users WHERE role = 'admin'"
    );
    console.log('\nAdmin users:');
    console.table(admins);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error changing password:', error);
    process.exit(1);
  }
}

changeAdminPassword();
