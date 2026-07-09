const fs = require('fs');
const files = ['admin.css', 'admin-workflow.js', 'admin.js', 'index.html', 'live.js', 'live.html', 'index.css'];

const replacements = [
    // BLUES -> BLACK
    [/#[2|3][5|7][6|9][3|9][E|e][B|b]/gi, '#000000'], // #2563EB
    [/#1[D|d]4[E|e][D|d]8/gi, '#000000'], // #1D4ED8
    [/rgba\(\s*37\s*,\s*99\s*,\s*235\s*,\s*([\d.]+)\s*\)/g, 'rgba(0, 0, 0, $1)'],
    
    // REDS -> BLACK
    [/#DC2626/gi, '#000000'],
    [/#FF6B6B/gi, '#000000'],
    [/#8B0000/gi, '#000000'],
    [/#FF3333/gi, '#000000'],
    [/#ff4444/gi, '#000000'],
    [/#FFAAAA/gi, '#000000'],
    [/rgba\(\s*239\s*,\s*68\s*,\s*68\s*,\s*([\d.]+)\s*\)/g, 'rgba(0, 0, 0, $1)'],
    [/rgba\(\s*255\s*,\s*107\s*,\s*107\s*,\s*([\d.]+)\s*\)/g, 'rgba(0, 0, 0, $1)'],
    [/rgba\(\s*255\s*,\s*0\s*,\s*0\s*,\s*([\d.]+)\s*\)/g, 'rgba(0, 0, 0, $1)'],
    [/rgba\(\s*20\s*,\s*0\s*,\s*0\s*,\s*([\d.]+)\s*\)/g, 'rgba(0, 0, 0, $1)'],

    // GREENS -> BLACK
    [/#4ADE80/gi, '#000000'],
    [/#c4dd40/gi, '#000000'],
    [/#69DB7C/gi, '#000000'],
    [/#25D366/gi, '#000000']
];

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    let content = fs.readFileSync(f, 'utf8');
    let original = content;
    
    replacements.forEach(([regex, replacement]) => {
        content = content.replace(regex, replacement);
    });
    
    if (original !== content) {
        fs.writeFileSync(f, content);
        console.log(`Updated ${f}`);
    }
});
