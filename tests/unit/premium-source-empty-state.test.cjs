const fs = require('fs');
const files = [
 ['components/WSourceClickbait.tsx','Nincs elérhető clickbait adat.'],
 ['components/WSourceClickbaitRatio.tsx','Nincs elérhető clickbait arány adat.'],
 ['components/WSourceDuplication.tsx','Nincs elérhető másolási adat.'],
 ['components/WSourceSpeedIndexLeaderboard.tsx','Nincs elérhető Speed Index adat.'],
 ['components/WSourceCategoryDistribution.tsx','Nincs elérhető forrás-kategória adat.']
];
for (const [file, marker] of files) {
 const s=fs.readFileSync(file,'utf8');
 if (!s.includes(marker)) throw new Error(`${file}: empty-state marker missing`);
}
console.log('premium source empty-state regression: PASS');
