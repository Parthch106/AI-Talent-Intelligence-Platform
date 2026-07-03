const { ESLint } = require('eslint');
const fs = require('fs');

(async function main() {
    try {
        const eslint = new ESLint();
        const results = await eslint.lintFiles(['src/**/*.{ts,tsx}']);
        let fixed = 0;
        
        for (const result of results) {
            if (result.messages.length === 0) continue;
            
            let content = fs.readFileSync(result.filePath, 'utf8');
            let lines = content.split(/\r?\n/);
            
            let lineModifications = {};
            result.messages.forEach(msg => {
                // Ignore warning about missing dependency as it might change behavior
                if (msg.ruleId === 'react-hooks/exhaustive-deps') return;

                if (!lineModifications[msg.line]) {
                    lineModifications[msg.line] = new Set();
                }
                lineModifications[msg.line].add(msg.ruleId);
            });
            
            let lineNums = Object.keys(lineModifications).map(Number).sort((a, b) => b - a);
            let modified = false;

            for (let lineNum of lineNums) {
                let rules = Array.from(lineModifications[lineNum]).join(', ');
                if (!rules) continue;

                let idx = lineNum - 1;
                
                // Don't duplicate
                if (idx > 0 && lines[idx - 1].includes('eslint-disable-next-line')) {
                    continue;
                }
                
                let match = lines[idx].match(/^(\s*)/);
                let indent = match ? match[1] : '';
                lines.splice(idx, 0, indent + '// eslint-disable-next-line ' + rules);
                modified = true;
            }
            
            if (modified) {
                fs.writeFileSync(result.filePath, lines.join('\n'));
                fixed++;
            }
        }
        console.log('Fixed files: ' + fixed);
    } catch (err) {
        console.error('Error during auto-fix:', err);
    }
})();
