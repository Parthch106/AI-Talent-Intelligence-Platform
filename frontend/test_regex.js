const desc = `Research and implement a basic project using Linux Basics.

Starter Script:
\`\`\`
# Start your implementation here
\`\`\``;

const scriptMatch = desc.match(/(.*?)(?:Starter Script:\s*\`\`\`(?:\w*\n)?([\s\S]*?)\`\`\`)(.*)/is);

console.log("Match:", !!scriptMatch);
if (scriptMatch) {
    console.log("preText:", scriptMatch[1]);
    console.log("scriptCode:", scriptMatch[2]);
    console.log("postText:", scriptMatch[3]);
}
