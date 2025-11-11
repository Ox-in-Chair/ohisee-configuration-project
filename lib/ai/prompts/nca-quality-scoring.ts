/**
 * NCA Quality Scoring Prompt Template
 * Generates corrective action suggestions aligned with BRCGS Section 5.7
 */

import { AnalysisContext, PromptTemplate } from '../types';

export class NCAQualityScoringPrompt implements PromptTemplate {
  readonly name = 'nca-quality-scoring';
  readonly version = '1.0';

  build(context: AnalysisContext): string {
    if (!context.nca) {
      throw new Error('NCA context required for NCA quality scoring');
    }

    const { nca, user, language_level, procedure_context, historical_similar } = context;

    return `You are an AI assistant for the OHiSee BRCGS compliance system at Kangopak (Pty) Ltd.

Your task is to analyze a Non-Conformance Advice (NCA) and generate a comprehensive corrective action suggestion following BRCGS Section 5.7 requirements.

## USER CONTEXT
- Name: ${user.name}
- Role: ${user.role}
- Language Level: ${language_level} (${this.getLanguageLevelDescription(language_level)})
- Department: ${user.department}

## LANGUAGE ADAPTATION
${this.getLanguageGuidelines(language_level)}

## CRITICAL: UK ENGLISH REQUIREMENTS
- Use British English spelling throughout (e.g., "colour", "organise", "centre", "realise", "recognise")
- Use British grammar conventions
- Ensure all text is professional but accessible for blue-collar workers
- Fix any broken English, grammar errors, or unclear phrasing while preserving the original meaning

## GMP COMPLIANCE REQUIREMENTS
- Ensure all suggestions align with Good Manufacturing Practices (GMP)
- Reference HACCP principles for root cause analysis
- Consider allergen management protocols if allergens are mentioned
- Include GMP-aligned preventive measures in corrective actions
- Flag any GMP violations detected in the description

## PACKAGING MATERIAL SAFETY (if applicable)
- If packaging materials are mentioned, reference BRCGS Section 5.8 (Foreign Body Contamination Control)
- Consider migration limits and barrier properties
- Include packaging-specific corrective actions
- Reference supplier certification requirements if applicable

## NCA DETAILS
- NCA ID: ${nca.nca_id}
- Type: ${nca.nc_type}${nca.nc_type_other ? ` (${nca.nc_type_other})` : ''}
- Description: ${nca.nc_description}
- Machine Status: ${nca.machine_status}
${nca.machine_status === 'down' && nca.machine_down_since ? `- Machine Down Since: ${nca.machine_down_since}` : ''}
- Cross Contamination Risk: ${nca.cross_contamination ? 'YES - MANDATORY BACK TRACKING REQUIRED' : 'No'}
- Disposition - Rework: ${nca.disposition_rework ? 'Yes' : 'No'}
- Disposition - Concession: ${nca.disposition_concession ? 'Yes' : 'No'}
${nca.root_cause_analysis ? `- Existing Root Cause Analysis: ${nca.root_cause_analysis}` : ''}

## RELEVANT BRCGS PROCEDURES
${procedure_context && procedure_context.length > 0
  ? procedure_context.map(p => `- ${p}`).join('\n')
  : '- 5.7 Control of Non-Conforming Product\n- 3.11 Corrective Action\n- 3.9 Traceability'}

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
- **Equipment**: machine, motor, bearing, seal, wear, breakdown, malfunction
- **Process**: specification, tolerance, out of spec, drift, parameter
- **Material**: raw material, film, supplier, batch, reel, gauge, defect
- **Operator**: operator error, training, forgot, missed, didn't check
- **Contamination**: foreign body, glass, metal, blade, contamination, debris
- **Calibration**: measurement, scale, gauge, accuracy, calibration, counting

## SPECIAL HANDLING FLAGS
${this.getSpecialHandlingFlags(nca)}

## OUTPUT FORMAT
Generate a comprehensive corrective action suggestion in JSON format:

\`\`\`json
{
  "text": "Full formatted suggestion with all sections below - NOTE: This is for CORRECTIVE ACTION field only, NOT for NC Description field",
  "sections": {
    "immediate_correction": "Actions to take RIGHT NOW (quarantine, segregation, hold labels per 5.7)",
    "root_cause": "Systematic investigation findings - WHY did this happen? Reference Section 2.2 HARA if process-related.",
    "corrective_action": "Long-term preventive actions - HOW to prevent recurrence? Include procedure updates, training, monitoring.",
    "verification": "How to verify effectiveness - Monitor next X batches, timeline, management review"
  },
  "quality_score": 0,
  "confidence": "high|medium|low",
  "confidence_percentage": 85,
  "procedure_references": ["5.7", "3.11", "3.9"],
  "keywords_detected": {
    "category": "equipment|process|material|operator|contamination|calibration",
    "keywords": ["identified", "keywords", "here"]
  },
  "recommendations": {
    "create_mjc": false,
    "calibration_check": false,
    "training_required": false,
    "hara_review": false
  }
}
\`\`\`

## QUALITY REQUIREMENTS
Your suggestion MUST:
1. **Completeness (30 points)**:
   - Include quarantine/segregation steps
   - Reference RED Hold sticker/label
   - Address back tracking if cross-contamination
   - Specify immediate corrections

2. **Accuracy (25 points)**:
   - Reference at least 2 BRCGS procedures (5.7, 3.11, etc.)
   - Use correct terminology for ${user.role} role
   - No generic placeholders - be specific
   - Cite procedure sections accurately

3. **Clarity (20 points)**:
   - Use language level ${language_level} appropriate for ${user.role}
   - Clear structure with distinct sections
   - Actionable steps (not vague suggestions)
   - 150-500 words total

4. **Hazard Identification (15 points)**:
   - Assess food safety impact
   - Identify hazard type (physical, chemical, biological, allergen)
   - Reference Section 5.8 if contamination risk

5. **Evidence (10 points)**:
   - Specify verification method
   - Include timeline (days/weeks/months)
   - Measurable success criteria

**Minimum acceptable score: 75/100**

## CRITICAL COMPLIANCE NOTES
- If cross_contamination = true: MANDATORY back tracking per Procedure 3.9
- If machine_status = "down": Add downtime alert for Operations Manager
- If disposition_concession = true: Require Team Leader/QA approval
- If foreign body keywords detected: Reference Section 5.8, trigger HACCP review
- All actions must respect user authority level (${user.role})

Generate the corrective action suggestion now. Return ONLY the JSON object, no additional text.`;
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
      return `- Use simple, everyday language
- Explain all technical terms
- Break instructions into clear steps
- Avoid BRCGS jargon (or explain when used)
- Focus on "what to do" rather than "why"`;
    } else if (level === 3) {
      return `- Use technical terminology freely
- Reference procedures by number (5.7, 3.11)
- Assume familiarity with BRCGS basics
- Balance technical accuracy with clarity`;
    } else {
      return `- Use full BRCGS compliance terminology
- Cite specific regulatory clauses
- Emphasize audit trail and documentation
- Include business/compliance impact
- Assume deep procedural knowledge`;
    }
  }

  private getSpecialHandlingFlags(nca: AnalysisContext['nca']): string {
    if (!nca) return 'None';

    const flags: string[] = [];

    if (nca.machine_status === 'down') {
      flags.push('⚠️ CRITICAL PRIORITY - MACHINE DOWN ALERT\n  → Operations Manager notification required\n  → Calculate downtime impact');
    }

    if (nca.cross_contamination) {
      flags.push('🔴 MANDATORY BACK TRACKING VERIFICATION (Procedure 3.9)\n  → Team Leader signature required\n  → Traceability emphasis critical');
    }

    if (nca.disposition_rework) {
      flags.push('📋 REWORK INSTRUCTION REQUIRED\n  → Specific quality checks\n  → Acceptance criteria\n  → Skills Matrix requirements');
    }

    if (nca.disposition_concession) {
      flags.push('⚠️ OUT-OF-SPECIFICATION CONCESSION\n  → Team Leader/QA authorization required\n  → Customer notification consideration\n  → Risk assessment documentation');
    }

    const description = nca.nc_description.toLowerCase();
    if (description.includes('foreign body') || description.includes('metal') || description.includes('glass')) {
      flags.push('🚨 FOREIGN BODY CONTAMINATION CONTROL (5.8)\n  → HACCP team review required\n  → Incident management per 3.12\n  → Product safety incident');
    }

    if (description.includes('calibration') || description.includes('measurement') || description.includes('scale')) {
      flags.push('📏 CALIBRATION VERIFICATION (5.6)\n  → Window of exposure assessment\n  → Product traceability if out-of-calibration\n  → 5.6F2 calibration records');
    }

    return flags.length > 0 ? flags.join('\n\n') : 'None - Standard NCA processing';
  }
}
