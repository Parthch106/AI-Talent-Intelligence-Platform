import { Quill } from 'react-quill-new';

// @ts-ignore
window.Quill = Quill;

// Monkey-patch Quill v2 compatibility for older Quill v1 modules (like imageResize)
try {
    const Parchment = Quill.import('parchment');
    // @ts-ignore
    const oldImports = Quill.imports || {};
    
    Object.defineProperty(Quill, 'imports', {
        value: {
            ...oldImports,
            parchment: Parchment
        },
        writable: true,
        configurable: true
    });
} catch (e) {
    console.error('Failed to monkey-patch Quill.imports:', e);
}
