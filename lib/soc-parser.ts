/**
 * SOC Notification Parser
 * Parses SOC email notifications into structured field data
 */

export interface SOCParsedData {
  title: string;
  description: string;
  fieldValues: {
    fieldName: string;
    value: string;
  }[];
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  securityClassification: 'HIGH' | 'MEDIUM' | 'LOW';
}

export function parseSOCNotification(text: string): SOCParsedData {
  const lines = text.split('\n').map(line => line.trim());
  const fieldValues: { fieldName: string; value: string }[] = [];
  let description = '';
  let recommendations = '';
  let inDescription = false;
  let inRecommendations = false;
  let severity: SOCParsedData['severity'] = 'Medium';
  let incidentType = '';

  // Regular expressions for parsing
  const fieldPatterns: { [key: string]: RegExp } = {
    date: /^Date\s*:\s*(.+)$/i,
    severity: /^Severity\s*:\s*(.+)$/i,
    firstAction: /^First Action Needed\s*:\s*(.+)$/i,
    caseIdLr: /^Case ID LR\s*:\s*(.+)$/i,
    ultimaId: /^Ultima ID\s*:\s*(.+)$/i,
    incidentType: /^Incident Type\s*:\s*(.+)$/i,
    ipHostOrigin: /^IP\s*\/\s*Host Origin\s*:\s*(.+)$/i,
    userOrigin: /^User Origin\s*:\s*(.+)$/i,
    ipHostImpacted: /^IP\s*\/\s*Host Impacted\s*:\s*(.+)$/i,
    userImpacted: /^User Impacted\s*:\s*(.+)$/i,
    logSource: /^Log Source\s*:\s*(.+)$/i,
    statusTicket: /^Status Tiket\s*:\s*(.+)$/i,
    port: /^Port\s*:\s*(.+)$/i,
    classification: /^Classification\s*:\s*(.+)$/i,
    url: /^URL\s*:\s*(.+)$/i,
    fileProcess: /^File_Proses\s*:\s*(.+)$/i,
    filePath: /^File_Path\s*:\s*(.+)$/i,
    action: /^Action\s*:\s*(.+)$/i,
  };

  // Field name mapping
  const fieldMapping: { [key: string]: string } = {
    date: 'soc_date_time',
    severity: 'soc_severity',
    firstAction: 'soc_first_action',
    caseIdLr: 'soc_case_id_lr',
    ultimaId: 'soc_ultima_id',
    incidentType: 'soc_incident_type',
    ipHostOrigin: 'soc_ip_host_origin',
    userOrigin: 'soc_user_origin',
    ipHostImpacted: 'soc_ip_host_impacted',
    userImpacted: 'soc_user_impacted',
    logSource: 'soc_log_source',
    statusTicket: 'soc_status_ticket',
    port: 'soc_port',
    classification: 'soc_classification',
    url: 'soc_url',
    fileProcess: 'soc_file_process',
    filePath: 'soc_file_path',
    action: 'soc_action'
  };

  // Parse line by line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for description start
    if (line.toLowerCase().startsWith('deskripsi:')) {
      inDescription = true;
      inRecommendations = false;
      continue;
    }

    // Check for recommendations start
    if (line.toLowerCase().startsWith('rekomendasi:')) {
      inDescription = false;
      inRecommendations = true;
      continue;
    }

    // Check for end markers
    if (line.toLowerCase().includes('terima kasih') || line.toLowerCase().includes('salam,')) {
      inDescription = false;
      inRecommendations = false;
      continue;
    }

    // If in description section
    if (inDescription) {
      description += line + '\n';
      continue;
    }

    // If in recommendations section
    if (inRecommendations) {
      recommendations += line + '\n';
      continue;
    }

    // Parse field values
    for (const [key, pattern] of Object.entries(fieldPatterns)) {
      const match = line.match(pattern);
      if (match) {
        const value = match[1].trim();
        
        // Clean up the value - replace '-' with empty string for empty fields
        const cleanValue = value === '-' ? '' : value;
        
        // Special handling for certain fields
        if (key === 'severity') {
          // Map severity values
          const severityMap: { [key: string]: SOCParsedData['severity'] } = {
            'critical': 'Critical',
            'high': 'High',
            'medium': 'Medium',
            'low': 'Low',
            'informational': 'Informational'
          };
          severity = severityMap[cleanValue.toLowerCase()] || 'Medium';
          fieldValues.push({
            fieldName: fieldMapping[key],
            value: severity
          });
        } else if (key === 'incidentType') {
          incidentType = cleanValue;
          fieldValues.push({
            fieldName: fieldMapping[key],
            value: cleanValue
          });
        } else {
          fieldValues.push({
            fieldName: fieldMapping[key],
            value: cleanValue
          });
        }
        break;
      }
    }
  }

  // Add description and recommendations
  if (description.trim()) {
    fieldValues.push({
      fieldName: 'soc_description',
      value: description.trim()
    });
  }

  if (recommendations.trim()) {
    fieldValues.push({
      fieldName: 'soc_recommendations',
      value: recommendations.trim()
    });
  }

  // Generate title - keep it simple
  const title = 'SOC Alert';

  // Map severity to security classification
  const securityClassificationMap: { [key: string]: 'HIGH' | 'MEDIUM' | 'LOW' } = {
    'Critical': 'HIGH',
    'High': 'HIGH',
    'Medium': 'MEDIUM',
    'Low': 'LOW',
    'Informational': 'LOW'
  };

  return {
    title,
    description: description.trim() || 'SOC security incident detected',
    fieldValues,
    severity,
    securityClassification: securityClassificationMap[severity] || 'MEDIUM'
  };
}

/**
 * Validates parsed SOC data to ensure required fields are present
 */
export function validateSOCData(data: SOCParsedData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const requiredFields = [
    'soc_date_time',
    'soc_severity',
    'soc_first_action',
    'soc_ultima_id',
    'soc_incident_type',
    'soc_ip_host_impacted',
    'soc_status_ticket',
    'soc_classification',
    'soc_description',
    'soc_recommendations'
  ];

  const presentFields = new Set(data.fieldValues.map(fv => fv.fieldName));

  for (const field of requiredFields) {
    if (!presentFields.has(field)) {
      errors.push(`Missing required field: ${field}`);
    } else {
      // Check if the field has a value
      const fieldValue = data.fieldValues.find(fv => fv.fieldName === field);
      if (!fieldValue || !fieldValue.value.trim()) {
        errors.push(`Required field ${field} is empty`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Example usage:
 * 
 * const socText = `Dear Team IT,
 * SOC Notification Alert!
 * Date                                : 08/04/2025 12:50:33 pm
 * Severity                          : High
 * ...`;
 * 
 * const parsed = parseSOCNotification(socText);
 * const validation = validateSOCData(parsed);
 * 
 * if (validation.valid) {
 *   // Create ticket with parsed data
 * } else {
 *   // Handle validation errors
 * }
 */