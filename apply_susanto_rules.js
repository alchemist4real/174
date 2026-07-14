const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'global-styles.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Fix button class collision. Change .btn inside the admin css part to .btn-admin or similar,
// but better yet, let's just make sure .btn is not overridden globally for circular buttons, 
// OR we just rename .btn in admin.html to .btn-unified.
// Let's replace `.btn {` in the admin section with `.btn-unified {`
css = css.replace(/\.btn\s*\{([^}]*)\}/g, (match, body) => {
    // If it contains border-radius: 50% it's the player button.
    if (body.includes('50%')) return match;
    // Otherwise it's the admin button
    return `.btn-unified {${body}}`;
});

// Update borders and radii in CSS
css = css.replace(/border-radius:\s*0/g, 'border-radius: 8px');
css = css.replace(/1px solid var\(--border-light\)/g, '1.5px solid var(--text-main)');
css = css.replace(/rgba\(255,255,255,0\.02\)/g, 'var(--bg-hover)');

fs.writeFileSync(cssPath, css, 'utf8');

const htmlFiles = [
    'admin.html',
    'live.html',
    'docs.html',
    'index.html'
];

htmlFiles.forEach(file => {
    let p = path.join(__dirname, file);
    if (!fs.existsSync(p)) return;
    let html = fs.readFileSync(p, 'utf8');

    // Accessibility: aria-hidden to decorative SVGs
    html = html.replace(/<svg([^>]+)>/g, (match, attrs) => {
        if (!attrs.includes('aria-label') && !attrs.includes('aria-hidden')) {
            return `<svg${attrs} aria-hidden="true">`;
        }
        return match;
    });

    if (file !== 'index.html') {
        // Change .btn to .btn-unified where it's used as a text button
        html = html.replace(/class="([^"]*)"/g, (match, classStr) => {
            if (classStr.includes('auth-btn')) return match;
            const classes = classStr.split(/\s+/);
            const newClasses = classes.map(c => {
                if (c === 'btn') return 'btn-unified';
                if (c === 'admin-theme-btn') return 'admin-theme-btn-unified';
                return c;
            });
            return `class="${newClasses.join(' ')}"`;
        });

        // Modals
        html = html.replace(/custom-modal-overlay/g, 'settings-overlay');
        html = html.replace(/custom-modal/g, 'settings-box');

        // Typography: Add Times New Roman to headers
        // Just find <h2> and <h1> and add a class or inline style font-family: var(--font-sans)
        html = html.replace(/<h2([^>]*)>/g, (match, attrs) => {
            if (!attrs.includes('font-family')) {
                return `<h2${attrs} style="font-family: var(--font-sans);">`;
            }
            return match;
        });
        html = html.replace(/<h1([^>]*)>/g, (match, attrs) => {
            if (!attrs.includes('font-family')) {
                return `<h1${attrs} style="font-family: var(--font-sans);">`;
            }
            return match;
        });

        // Zero-emoji
        html = html.replace(/🗑️/g, '');

        // Accessibility for status rows
        html = html.replace(/id="statusText"/g, 'id="statusText" role="status" aria-live="polite"');
    }

    fs.writeFileSync(p, html, 'utf8');
});

console.log("Susanto rules applied successfully.");
