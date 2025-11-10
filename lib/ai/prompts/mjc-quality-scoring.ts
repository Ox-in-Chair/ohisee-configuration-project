/**
 * MJC Quality Scoring Prompt Template
 * Generates maintenance action suggestions aligned with BRCGS Section 4.7
 */

import { AnalysisContext, PromptTemplate } from '../types';

export class MJCQualityScoringPrompt implements PromptTemplate {
  readonly name = 'mjc-quality-scoring';
  readonly version = '1.0';

  build(context: AnalysisContext): string {
    if (!context.mjc) {
      throw new Error('MJC context required for MJC quality scoring');
    }

    const { mjc, user, language_level, procedure_context, historical_similar } = context;

    return `You are an AI assistant for the OHiSee BRCGS compliance system at Kangopak (Pty) Ltd.

Your task is to analyze a Maintenance Job Card (MJC) and generate a comprehensive maintenance action suggestion following BRCGS Section 4.7 requirements with emphasis on food safety hygiene clearance.

## USER CONTEXT
- Name: ${user.name}
- Role: ${user.role}
- Language Level: ${language_level} (${this.getLanguageLevelDescription(language_level)})
- Department: ${user.department}

## LANGUAGE ADAPTATION
${this.getLanguageGuidelines(language_level)}

## MJC DETAILS
- MJC ID: ${mjc.mjc_id}
- Equipment: ${mjc.machine_equipment}
- Category: ${mjc.maintenance_category}
- Urgency: ${mjc.urgency}
- Description: ${mjc.description_required}
- Machine Status: ${mjc.machine_status}
- Maintenance Types:
  ${mjc.maintenance_type_electrical ? '✓ Electrical' : ''}
  ${mjc.maintenance_type_mechanical ? '✓ Mechanical' : ''}
  ${mjc.maintenance_type_pneumatical ? '✓ Pneumatic' : ''}
  ${mjc.maintenance_type_other ? `✓ Other: ${mjc.maintenance_type_other}` : ''}
- Temporary Repair: ${mjc.temporary_repair ? 'YES - 14-DAY CLOSE OUT REQUIRED ⚠️' : 'No'}

## RELEVANT BRCGS PROCEDURES
${procedure_context && procedure_context.length > 0
  ? procedure_context.map(p => `- ${p}`).join('\n')
  : '- 4.7 Maintenance Management\n- 5.8 Foreign Body Contamination Control\n- 5.6 Measuring and Monitoring Devices'}

## SIMILAR HISTORICAL CASES
${historical_similar && historical_similar.length > 0
  ? historical_similar.map(h => `
### ${h.record_id} (Similarity: ${Math.round(h.similarity_score * 100)}%)
Description: ${h.description}
Action Taken: ${h.corrective_action}
`).join('\n')
  : 'No similar historical cases found.'}

## KEYWORD DETECTION RULES
Analyze the description for these categories:
- **Urgent**: broken, failed, stopped, emergency, critical, not working
- **Safety Critical**: guard, interlock, e-stop, safety, hazard, injury
- **Contamination Risk**: leak, oil, grease, metal, debris, loose, missing
- **Calibration Equipment**: scale, gauge, measuring, testing, counting, sensor
- **Electrical**: electrical, motor, power, circuit, control, PLC
- **Mechanical**: bearing, chain, belt, alignment, lubrication
- **Pneumatic**: air, pneumatic, cylinder, valve, pressure, leak

## SPECIAL HANDLING FLAGS
${this.getSpecialHandlingFlags(mjc)}

## OUTPUT FORMAT
Generate a comprehensive maintenance action suggestion in JSON format:

\`\`\`json
{
  "text": "Full formatted suggestion with all sections below",
  "sections": {
    "maintenance_scope": "Detailed work to be performed - specific parts, torque specs, alignment procedures, etc.",
    "safety_considerations": "LOTO procedures, PPE requirements, energy isolation, hazard controls",
    "contamination_prevention": "Clean as you go, tool control (shadow board), swarf management, debris removal",
    "hygiene_clearance": "MANDATORY 10-ITEM CHECKLIST:\\n1. All excess grease & oil removed\\n2. All swarf & metal filings removed\\n3. All tools & consumables accounted for (shadow board check)\\n4. All temporary fixings removed\\n5. Area cleaned & sanitized\\n6. No foreign body contamination risk\\n7. Equipment guards replaced & secure\\n8. Test samples taken (if food contact)\\n9. QA Supervisor sign-off obtained\\n10. Production authorized to resume",
    "verification": "Functional test, test samples, calibration check (if measuring equipment), post-maintenance monitoring"
  },
  "quality_score": 0,
  "confidence": "high|medium|low",
  "confidence_percentage": 85,
  "procedure_references": ["4.7", "5.8", "5.6"],
  "keywords_detected": {
    "category": "urgent|safety_critical|contamination_risk|calibration|electrical|mechanical|pneumatic",
    "keywords": ["identified", "keywords", "here"]
  },
  "recommendations": {
    "create_mjc": false,
    "calibration_check": ${this.requiresCalibrationCheck(mjc.description_required)},
    "training_required": false,
    "hara_review": false
  }
}
\`\`\`

## QUALITY REQUIREMENTS
Your suggestion MUST:
1. **Completeness (30 points)**:
   - Specific part numbers/components where possible
   - Torque specifications or alignment procedures
   - Safety emphasis (LOTO, PPE, energy isolation)
   - Contamination prevention steps (Clean as You Go)

2. **Accuracy (25 points)**:
   - COMPLETE 10-item hygiene clearance checklist (MANDATORY)
   - Reference procedures: 4.7, 5.8, 5.6 where applicable
   - Technical terminology appropriate for ${user.role}
   - Shadow board/tool control if metal work involved

3. **Clarity (20 points)**:
   - Use language level ${language_level} appropriate for ${user.role}
   - Step-by-step format for maintenance scope
   - Clear safety warnings
   - 100-400 words total

4. **Safety Emphasis (15 points)**:
   - LOTO procedure mentioned if energy source
   - PPE requirements specified
   - Food safety consideration (contamination prevention)
   - Guard/interlock verification

5. **Verification (10 points)**:
   - Functional test procedure
   - Test samples if food contact area
   - Calibration verification if measuring equipment
   - QA sign-off requirement

**Minimum acceptable score: 75/100**

## CRITICAL COMPLIANCE NOTES
- **HYGIENE CLEARANCE IS MANDATORY**: All 10 checklist items MUST be included
- If temporary_repair = true: Add "⚠️ TEMPORARY REPAIR - 14-DAY CLOSE OUT REQUIRED ⚠️" with due date
- If machine_status = "down" AND urgency = "critical": Emphasize <1 hour response, notify Maintenance Manager
- If involves measuring equipment: CALIBRATION VERIFICATION REQUIRED (5.6), assess window of exposure
- If mechanical work with metal: FOREIGN BODY CONTAMINATION CONTROL (5.8) - swarf mat, tool accountability, metal detector test
- QA Supervisor sign-off REQUIRED for hygiene clearance before production resumes

Generate the maintenance action suggestion now. Return ONLY the JSON object, no additional text.`;
  }

  private getLanguageLevelDescription(level: number): string {
    const descriptions: Record<number, string> = {
      1: 'Basic - Simple language, no jargon',
      2: 'Intermediate - Some technical terms with explanations',
      3: 'Competent - Technical terminology, procedural references',
      4: 'Advanced - Full compliance terminology, regulatory references',
      5: 'Executive - KPIs, business impact, strategic implications'
    };
    return descriptions[level] ?? 'Competent';
  }

  private getLanguageGuidelines(level: number): string {
    if (level <= 2) {
      return `- Use simple technical language (operator-friendly)
- Explain safety procedures clearly
- Step-by-step instructions
- Emphasize "what" and "how" over "why"`;
    } else if (level === 3) {
      return `- Use maintenance technical terminology
- Reference procedures by number
- Assume familiarity with equipment
- Balance technical detail with food safety awareness`;
    } else {
      return `- Full technical + compliance terminology
- Emphasize BRCGS audit readiness
- Include business impact (downtime cost)
- Resource allocation considerations`;
    }
  }

  private getSpecialHandlingFlags(mjc: AnalysisContext['mjc']): string {
    if (!mjc) return 'None';

    const flags: string[] = [];

    if (mjc.temporary_repair) {
      flags.push('⚠️ TEMPORARY REPAIR - 14-DAY CLOSE OUT REQUIRED ⚠️\n  → Calculate close_out_due_date (TODAY + 14 days)\n  → Follow-up MJC creation reminder\n  → Permanent fix must be scheduled within 10 days');
    }

    if (mjc.machine_status === 'down' && mjc.urgency === 'critical') {
      flags.push('🚨 CRITICAL MACHINE DOWN - IMMEDIATE RESPONSE 🚨\n  → <1 hour response time required\n  → Maintenance Manager notification\n  → Parts expediting authorization\n  → Downtime cost tracking');
    }

    const description = mjc.description_required.toLowerCase();

    if (this.affectsMeasuringEquipment(description)) {
      flags.push('📏 CALIBRATION VERIFICATION REQUIRED (5.6)\n  → Window of exposure assessment\n  → Product traceability if out-of-calibration\n  → 5.6F2 calibration records update');
    }

    if (this.involvesMetalWork(description, mjc)) {
      flags.push('🔧 FOREIGN BODY CONTAMINATION CONTROL (5.8)\n  → Swarf mat requirements\n  → Tool accountability (shadow board check-out/return)\n  → Metal detector test if product has CCP\n  → All metal filings must be removed and accounted for');
    }

    if (description.includes('leak') || description.includes('oil') || description.includes('grease')) {
      flags.push('🧼 HYGIENE PRIORITY\n  → Clean as you go mandatory\n  → All excess lubricant must be removed\n  → QA verification before production resume\n  → Food contact area cleaning if applicable');
    }

    if (description.includes('guard') || description.includes('interlock') || description.includes('e-stop') || description.includes('safety')) {
      flags.push('⚠️ SAFETY-CRITICAL EQUIPMENT\n  → Extra verification required\n  → Test all safety functions post-repair\n  → Document safety device functionality\n  → Supervisor sign-off mandatory');
    }

    return flags.length > 0 ? flags.join('\n\n') : 'None - Standard MJC processing';
  }

  private affectsMeasuringEquipment(description: string): boolean {
    const keywords = ['scale', 'gauge', 'measuring', 'sensor', 'counting', 'calibration', 'weight', 'measurement'];
    return keywords.some(kw => description.toLowerCase().includes(kw));
  }

  private involvesMetalWork(description: string, mjc: AnalysisContext['mjc']): boolean {
    if (!mjc) return false;

    const metalKeywords = ['weld', 'grind', 'drill', 'cut', 'metal', 'swarf', 'filing', 'machine', 'bolt', 'screw'];
    const hasMechanical = mjc.maintenance_type_mechanical;

    return hasMechanical && metalKeywords.some(kw => description.toLowerCase().includes(kw));
  }

  private requiresCalibrationCheck(description: string): boolean {
    return this.affectsMeasuringEquipment(description);
  }
}
