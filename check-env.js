require('dotenv').config({ path: '.env.local' });

console.log('--- CHECK ENV ---');
console.log('Current Directory:', process.cwd());
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
