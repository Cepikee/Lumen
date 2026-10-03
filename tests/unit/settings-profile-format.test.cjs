const fs = require('fs');
const source = fs.readFileSync('components/SettingsView.tsx', 'utf8');
if (!source.includes('user.avatar_seed || user.nickname || "user"')) throw new Error('avatar URL needs a seed fallback');
if (!source.includes('!Number.isNaN(premiumDate.getTime())')) throw new Error('premium date must reject invalid dates');
console.log('settings profile format safety: PASS');
