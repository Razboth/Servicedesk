// Script to create multiple reports via API
const reports = [
  {
    title: "Rekap Permasalahan ATM",
    type: "TABULAR",
    module: "TICKETS",
    columns: ["ticketNumber", "createdAt", "atm.terminal", "atm.branch.name", "title", "status", "priority"],
    filters: [
      {
        column: "category",
        operator: "equals",
        value: "ATM"
      }
    ],
    groupBy: ["atm.terminal", "status"],
    orderBy: { "createdAt": "desc" }
  },
  {
    title: "Rekap Tiket Open & OnHold 2024",
    type: "TABULAR",
    module: "TICKETS", 
    columns: ["ticketNumber", "createdAt", "title", "status", "assignedTo.name", "branch.name"],
    filters: [
      {
        column: "status",
        operator: "in",
        value: "OPEN,ON_HOLD"
      },
      {
        column: "createdAt",
        operator: "greater_than_or_equal",
        value: "2024-01-01",
        logicalOperator: "AND"
      }
    ],
    groupBy: [],
    orderBy: { "createdAt": "desc" }
  },
  {
    title: "Rekap No Arsip & Nasabah Klaim",
    type: "TABULAR",
    module: "TICKETS",
    columns: ["ticketNumber", "createdAt", "title", "customFields.archiveNumber", "customFields.customerName", "status"],
    filters: [
      {
        column: "category",
        operator: "equals",
        value: "CLAIM"
      }
    ],
    groupBy: [],
    orderBy: { "createdAt": "desc" }
  },
  {
    title: "Rekap Permintaan Buka Operasional di Hari Libur",
    type: "TABULAR",
    module: "TICKETS",
    columns: ["ticketNumber", "createdAt", "branch.name", "requestDate", "status", "approvedBy.name"],
    filters: [
      {
        column: "service.name",
        operator: "contains",
        value: "Hari Libur"
      }
    ],
    groupBy: ["branch.name"],
    orderBy: { "createdAt": "desc" }
  },
  {
    title: "Rekap Permintaan Perpanjangan Waktu Operasional",
    type: "TABULAR",
    module: "TICKETS",
    columns: ["ticketNumber", "createdAt", "branch.name", "requestDate", "extensionHours", "status"],
    filters: [
      {
        column: "service.name",
        operator: "contains",
        value: "Perpanjangan"
      }
    ],
    groupBy: ["branch.name"],
    orderBy: { "createdAt": "desc" }
  },
  {
    title: "Requests by Category",
    type: "METRICS",
    module: "TICKETS",
    columns: ["category", "status"],
    filters: [],
    groupBy: ["category"],
    orderBy: { "_count": "desc" },
    chartConfig: {
      enabled: true,
      type: "bar",
      xAxis: "category",
      yAxis: "_count"
    }
  },
  {
    title: "Requests by Group",
    type: "METRICS",
    module: "TICKETS",
    columns: ["supportGroup.name", "status"],
    filters: [],
    groupBy: ["supportGroup.name"],
    orderBy: { "_count": "desc" },
    chartConfig: {
      enabled: true,
      type: "bar",
      xAxis: "supportGroup.name",
      yAxis: "_count"
    }
  },
  {
    title: "Requests by Created Date",
    type: "TABULAR",
    module: "TICKETS",
    columns: ["createdAt", "status"],
    filters: [],
    groupBy: ["createdAt", "status"],
    orderBy: { "createdAt": "desc" },
    chartConfig: {
      enabled: true,
      type: "line",
      xAxis: "createdAt",
      yAxis: "_count"
    }
  },
  {
    title: "Requests by Department",
    type: "METRICS", 
    module: "TICKETS",
    columns: ["createdBy.department", "status"],
    filters: [],
    groupBy: ["createdBy.department"],
    orderBy: { "_count": "desc" },
    chartConfig: {
      enabled: true,
      type: "pie",
      dimension: "createdBy.department",
      metric: "_count"
    }
  },
  {
    title: "Requests by Due Date",
    type: "TABULAR",
    module: "TICKETS",
    columns: ["dueDate", "ticketNumber", "title", "status", "priority"],
    filters: [
      {
        column: "dueDate",
        operator: "is_not_empty"
      }
    ],
    groupBy: [],
    orderBy: { "dueDate": "asc" }
  },
  {
    title: "Requests by Level",
    type: "METRICS",
    module: "TICKETS",
    columns: ["tierCategory.name", "status"],
    filters: [],
    groupBy: ["tierCategory.name"],
    orderBy: { "_count": "desc" },
    chartConfig: {
      enabled: true,
      type: "bar",
      xAxis: "tierCategory.name",
      yAxis: "_count"
    }
  },
  {
    title: "Requests by Priority",
    type: "METRICS",
    module: "TICKETS",
    columns: ["priority", "status"],
    filters: [],
    groupBy: ["priority", "status"],
    orderBy: { "priority": "desc" },
    chartConfig: {
      enabled: true,
      type: "bar",
      xAxis: "priority",
      yAxis: "_count",
      series: "status"
    }
  },
  {
    title: "Requests by Status",
    type: "METRICS",
    module: "TICKETS",
    columns: ["status"],
    filters: [],
    groupBy: ["status"],
    orderBy: { "_count": "desc" },
    chartConfig: {
      enabled: true,
      type: "pie",
      dimension: "status",
      metric: "_count"
    }
  },
  {
    title: "Requests by Technician",
    type: "TABULAR",
    module: "TICKETS",
    columns: ["assignedTo.name", "status", "priority"],
    filters: [
      {
        column: "assignedTo.id",
        operator: "is_not_empty"
      }
    ],
    groupBy: ["assignedTo.name", "status"],
    orderBy: { "_count": "desc" },
    chartConfig: {
      enabled: true,
      type: "bar",
      xAxis: "assignedTo.name",
      yAxis: "_count",
      series: "status"
    }
  }
];

async function createReports() {
  console.log('Creating reports...');
  
  for (const report of reports) {
    try {
      const response = await fetch('http://localhost:3000/api/reports/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'authjs.session-token=YOUR_SESSION_TOKEN' // You'll need to add your session token
        },
        body: JSON.stringify({
          ...report,
          chartConfig: report.chartConfig || null,
          query: '',
          schedule: null
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✓ Created report: ${report.title} (ID: ${data.id})`);
      } else {
        const error = await response.json();
        console.error(`✗ Failed to create report: ${report.title}`, error);
      }
    } catch (error) {
      console.error(`✗ Error creating report: ${report.title}`, error);
    }
    
    // Add delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('Report creation complete!');
}

// Run the script
createReports();