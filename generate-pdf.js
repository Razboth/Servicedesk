const { mdToPdf } = require('md-to-pdf');
const path = require('path');

async function generatePDF() {
  try {
    const pdf = await mdToPdf(
      { path: 'OMNI-API-Documentation.md' },
      {
        pdf_options: {
          format: 'A4',
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
          },
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<div style="font-size: 10px; margin: 0 auto;">Bank SulutGo ServiceDesk - OMNI API Documentation</div>',
          footerTemplate: '<div style="font-size: 10px; margin: 0 auto;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
        },
        css: `
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: none;
            margin: 0;
            padding: 20px;
          }

          h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-top: 30px;
          }

          h2 {
            color: #34495e;
            border-bottom: 2px solid #bdc3c7;
            padding-bottom: 5px;
            margin-top: 25px;
          }

          h3 {
            color: #2c3e50;
            margin-top: 20px;
          }

          code {
            background-color: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 90%;
            color: #e74c3c;
          }

          pre {
            background-color: #2c3e50;
            color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.4;
            margin: 15px 0;
          }

          pre code {
            background-color: transparent;
            color: inherit;
            padding: 0;
            border-radius: 0;
            font-size: inherit;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 14px;
          }

          table th,
          table td {
            border: 1px solid #bdc3c7;
            padding: 12px;
            text-align: left;
            vertical-align: top;
          }

          table th {
            background-color: #3498db;
            color: white;
            font-weight: bold;
          }

          table tr:nth-child(even) {
            background-color: #f8f9fa;
          }

          blockquote {
            border-left: 4px solid #3498db;
            margin: 0;
            padding-left: 20px;
            color: #7f8c8d;
            font-style: italic;
          }

          .toc {
            background-color: #ecf0f1;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 30px;
          }

          .toc h2 {
            margin-top: 0;
            color: #2c3e50;
            border-bottom: none;
          }

          strong {
            color: #2c3e50;
          }

          hr {
            border: none;
            border-top: 2px solid #bdc3c7;
            margin: 30px 0;
          }

          ul, ol {
            padding-left: 25px;
          }

          li {
            margin-bottom: 5px;
          }

          .endpoint-method {
            background-color: #27ae60;
            color: white;
            padding: 3px 8px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 12px;
            margin-right: 10px;
          }

          .endpoint-method.post {
            background-color: #f39c12;
          }

          .endpoint-method.get {
            background-color: #3498db;
          }

          .endpoint-method.patch {
            background-color: #9b59b6;
          }

          @media print {
            body { -webkit-print-color-adjust: exact; }
            pre { page-break-inside: avoid; }
            table { page-break-inside: avoid; }
            h1, h2, h3 { page-break-after: avoid; }
          }
        `,
        launch_options: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      }
    );

    if (pdf) {
      require('fs').writeFileSync('OMNI-API-Documentation.pdf', pdf);
      console.log('✅ PDF generated successfully: OMNI-API-Documentation.pdf');
    }
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
  }
}

generatePDF();