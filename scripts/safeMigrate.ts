import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const backupDir = join(process.cwd(), 'backups');

// Ensure backups directory exists
if (!existsSync(backupDir)) {
  mkdirSync(backupDir);
}

// Create timestamp for backup file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = join(backupDir, `backup-${timestamp}.sql`);

try {
  // Get database URL from .env
  require('dotenv').config();
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL not found in environment');
  }

  // Create backup
  console.log('Creating database backup...');
  execSync(`pg_dump "${dbUrl}" > "${backupFile}"`);
  console.log(`Backup created at: ${backupFile}`);

  // Create migration
  const migrationName = process.argv[2] || 'migration';
  console.log('\nCreating migration...');
  execSync(`npx prisma migrate dev --create-only --name ${migrationName}`, { stdio: 'inherit' });
  
  // Prompt for review
  console.log('\nPlease review the migration file before continuing.');
  console.log('Press Ctrl+C to abort or Enter to continue...');
  
  process.stdin.once('data', async () => {
    // Apply migration
    console.log('\nApplying migration...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    console.log('\nMigration completed successfully!');
    process.exit(0);
  });

} catch (error) {
  console.error('Error during migration:', error);
  process.exit(1);
} 