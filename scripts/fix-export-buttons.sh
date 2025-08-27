#!/bin/bash

# List of files with incorrect ExportButton props
FILES=(
  "app/reports/business/customer-experience/page.tsx"
  "app/reports/business/operational-excellence/page.tsx"
  "app/reports/compliance/security/page.tsx"
  "app/reports/compliance/system-health/page.tsx"
  "app/reports/infrastructure/atm-intelligence/page.tsx"
  "app/reports/infrastructure/technical-trends/page.tsx"
)

for file in "${FILES[@]}"; do
  # Replace the ExportButton props
  sed -i '/ExportButton/,/>/ {
    s/data={data}/onExport={handleExport}/
    s/filename={[^}]*}/reportName="Report"/
    s/title="\([^"]*\)"/reportName="\1"/
    /disabled=/!s|/>$|disabled={!data} />|
  }' "$file"
  
  # Add handleExport function if not exists
  if ! grep -q "handleExport" "$file"; then
    # Find the line before useEffect and add handleExport function
    sed -i '/useEffect(/i\
  const handleExport = async (format: string) => {\
    if (!data) return;\
    \
    const exportData = {\
      reportTitle: document.title,\
      dateRange: `${startDate} to ${endDate}`,\
      ...data,\
      generatedAt: new Date().toISOString()\
    };\
\
    if (format === "xlsx") {\
      console.log("Exporting to Excel:", exportData);\
    } else if (format === "pdf") {\
      console.log("Exporting to PDF:", exportData);\
    } else if (format === "csv") {\
      console.log("Exporting to CSV:", exportData);\
    }\
  };\
' "$file"
  fi
  
  echo "Fixed: $file"
done