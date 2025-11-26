#!/usr/bin/env node

/**
 * Script para converter o guia HTML em PDF
 *
 * Uso:
 * node convert-to-pdf.js
 */

const fs = require('fs');
const path = require('path');

console.log('📄 Conversor HTML para PDF - A Colmeia\n');

// Verificar se o arquivo HTML existe
const htmlPath = path.join(__dirname, 'GUIA_COMPLETO_A_COLMEIA.html');
const pdfPath = path.join(__dirname, 'GUIA_COMPLETO_A_COLMEIA.pdf');

if (!fs.existsSync(htmlPath)) {
    console.error('❌ Erro: Arquivo HTML não encontrado:', htmlPath);
    process.exit(1);
}

console.log('✅ Arquivo HTML encontrado:', htmlPath);
console.log('\n📝 INSTRUÇÕES PARA GERAR O PDF:\n');
console.log('Existem 3 métodos para converter o HTML em PDF:\n');

console.log('MÉTODO 1 - NAVEGADOR (Mais Simples) 🌐');
console.log('------------------------------------------');
console.log('1. Abra o arquivo GUIA_COMPLETO_A_COLMEIA.html no seu navegador');
console.log('2. Pressione Ctrl+P (ou Cmd+P no Mac)');
console.log('3. Selecione "Salvar como PDF" como impressora');
console.log('4. Configure:');
console.log('   - Margens: Padrão ou Mínimas');
console.log('   - Orientação: Retrato');
console.log('   - Incluir planos de fundo: SIM (importante para cores)');
console.log('5. Clique em "Salvar"\n');

console.log('MÉTODO 2 - CHROME HEADLESS (Linha de Comando) 💻');
console.log('------------------------------------------');
console.log('Execute no terminal:');
console.log(`
google-chrome --headless --disable-gpu --print-to-pdf="${pdfPath}" "${htmlPath}"

OU no Mac:
/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --headless --disable-gpu --print-to-pdf="${pdfPath}" "${htmlPath}"
`);

console.log('MÉTODO 3 - WKHTMLTOPDF (Se instalado) 🔧');
console.log('------------------------------------------');
console.log('Se você tiver wkhtmltopdf instalado:');
console.log(`
wkhtmltopdf --enable-local-file-access --page-size A4 "${htmlPath}" "${pdfPath}"
`);

console.log('MÉTODO 4 - ONLINE (Conversores Web) 🌍');
console.log('------------------------------------------');
console.log('Use um conversor online como:');
console.log('- https://www.html2pdf.com/');
console.log('- https://pdfcrowd.com/');
console.log('- https://cloudconvert.com/html-to-pdf\n');

console.log('═══════════════════════════════════════════════════════\n');
console.log('💡 RECOMENDAÇÃO: Use o Método 1 (navegador) para melhor qualidade!\n');

// Criar um arquivo de instruções
const instructionsPath = path.join(__dirname, 'INSTRUCOES_PDF.txt');
const instructions = `
INSTRUÇÕES PARA CONVERTER O GUIA EM PDF
========================================

Arquivo HTML: ${htmlPath}
Arquivo PDF desejado: ${pdfPath}

MÉTODO RECOMENDADO: USAR O NAVEGADOR
-------------------------------------
1. Clique duas vezes em "GUIA_COMPLETO_A_COLMEIA.html" para abrir no navegador
2. Pressione Ctrl+P (Windows/Linux) ou Cmd+P (Mac)
3. Em "Destino" ou "Impressora", selecione "Salvar como PDF"
4. Configure:
   ✓ Margens: Padrão
   ✓ Orientação: Retrato
   ✓ Incluir gráficos de plano de fundo: SIM (importante!)
5. Clique em "Salvar" e escolha onde salvar o PDF

ALTERNATIVA: CHROME HEADLESS
-----------------------------
Execute no terminal (Windows/Linux):
google-chrome --headless --disable-gpu --print-to-pdf="${pdfPath}" "${htmlPath}"

Execute no terminal (Mac):
/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --headless --disable-gpu --print-to-pdf="${pdfPath}" "${htmlPath}"

ALTERNATIVA: CONVERSORES ONLINE
--------------------------------
1. Acesse https://www.html2pdf.com/
2. Faça upload do arquivo GUIA_COMPLETO_A_COLMEIA.html
3. Clique em "Convert"
4. Baixe o PDF gerado

═══════════════════════════════════════════════════════
O PDF final terá aproximadamente 50-60 páginas
═══════════════════════════════════════════════════════
`;

fs.writeFileSync(instructionsPath, instructions);
console.log(`✅ Instruções salvas em: ${instructionsPath}\n`);

// Abrir o HTML no navegador automaticamente (se possível)
const { exec } = require('child_process');

const openCommand = process.platform === 'win32' ? 'start' :
                   process.platform === 'darwin' ? 'open' : 'xdg-open';

console.log('🌐 Tentando abrir o HTML no navegador...\n');
exec(`${openCommand} "${htmlPath}"`, (error) => {
    if (error) {
        console.log('⚠️  Não foi possível abrir automaticamente.');
        console.log(`Por favor, abra manualmente: ${htmlPath}\n`);
    } else {
        console.log('✅ HTML aberto no navegador!');
        console.log('Agora use Ctrl+P para salvar como PDF.\n');
    }
});
