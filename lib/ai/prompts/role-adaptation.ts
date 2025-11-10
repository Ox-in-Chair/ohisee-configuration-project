/**
 * Role Adaptation Prompt Template
 * Adapts AI language based on user role and training status
 * References: AI_Language_Adaptation_Framework.md
 */

import { AnalysisContext, LanguageLevel } from '../types';

export class RoleAdaptationPrompt {
  /**
   * Build field-level analysis prompt with role adaptation
   */
  buildFieldAnalysisPrompt(context: AnalysisContext): string {
    const { user, language_level, nca, mjc } = context;

    const recordType = nca ? 'NCA' : 'MJC';
    const description = nca?.nc_description ?? mjc?.description_required ?? '';

    return `You are an AI assistant for the OHiSee BRCGS compliance system.

## USER CONTEXT
- Name: ${user.name}
- Role: ${user.role}
- Language Level: ${language_level} (${this.getLanguageLevelName(language_level)})

## LANGUAGE ADAPTATION
${this.getLanguageGuidelines(language_level, user.role)}

## TASK
Analyze the following ${recordType} description and provide quality feedback.

**Description:**
${description}

## OUTPUT
Provide a brief quality assessment (2-3 sentences) focusing on:
1. Completeness - Is the description detailed enough?
2. Clarity - Is it clear what the issue is?
3. Food Safety - Are there any food safety concerns?

Use language appropriate for a ${user.role} at level ${language_level}.

Return your assessment as plain text (not JSON).`;
  }

  /**
   * Get language level name
   */
  private getLanguageLevelName(level: LanguageLevel): string {
    const names: Record<LanguageLevel, string> = {
      1: 'Basic',
      2: 'Intermediate',
      3: 'Competent',
      4: 'Advanced',
      5: 'Executive'
    };
    return names[level];
  }

  /**
   * Get role-specific language guidelines
   */
  private getLanguageGuidelines(level: LanguageLevel, role: string): string {
    if (level <= 2) {
      return this.getBasicGuidelines();
    } else if (level === 3) {
      return this.getCompetentGuidelines(role);
    } else if (level === 4) {
      return this.getAdvancedGuidelines(role);
    } else {
      return this.getExecutiveGuidelines();
    }
  }

  private getBasicGuidelines(): string {
    return `**Language Level: Basic/Intermediate**
- Use simple, everyday language
- Avoid technical jargon or explain it clearly
- Short sentences, clear structure
- Focus on immediate actions
- Use "you" and "your" (direct, friendly)
- Example: "Put the product on hold" instead of "Quarantine non-conforming inventory"`;
  }

  private getCompetentGuidelines(role: string): string {
    return `**Language Level: Competent**
- Use technical terminology appropriate for ${role}
- Reference procedures by number (e.g., "per Procedure 5.7")
- Assume familiarity with BRCGS basics
- Balance technical accuracy with clarity
- Example: "Segregate affected product and complete hold label per 5.7"`;
  }

  private getAdvancedGuidelines(role: string): string {
    return `**Language Level: Advanced**
- Full BRCGS compliance terminology
- Cite specific regulatory clauses and sections
- Emphasize audit trail and documentation requirements
- Include risk assessment considerations
- Frame in terms of food safety impact
- Example: "Disposition decision required per 5.7 with documented risk assessment and traceability verification"`;
  }

  private getExecutiveGuidelines(): string {
    return `**Language Level: Executive**
- Lead with business impact and KPIs
- Strategic implications and risk analysis
- Regulatory compliance status
- Audit readiness considerations
- Resource allocation implications
- Example: "Non-conformance trend indicates systematic process control gap - proactive investigation recommended to prevent audit finding and customer impact"`;
  }

  /**
   * Get role-specific terminology glossary
   */
  getTerminologyGlossary(role: string, level: LanguageLevel): Record<string, string> {
    if (level <= 2 && (role === 'operator' || role === 'team-leader')) {
      return {
        'non-conformance': 'issue or problem with the product',
        'quarantine': 'put on hold',
        'disposition': 'decision about what to do with the product',
        'segregate': 'keep separate from good product',
        'traceability': 'tracking where the product came from',
        'corrective action': 'steps to fix the problem and prevent it happening again',
        'root cause': 'the real reason why the problem happened'
      };
    }

    // For competent and above, use full terminology
    return {};
  }

  /**
   * Adapt message tone based on urgency and role
   */
  adaptTone(urgency: 'low' | 'medium' | 'high' | 'critical', role: string): string {
    if (urgency === 'critical') {
      if (role === 'operator' || role === 'team-leader') {
        return 'URGENT - Immediate action needed';
      } else {
        return 'CRITICAL PRIORITY - Immediate response required';
      }
    } else if (urgency === 'high') {
      return role === 'operator' ? 'Important - Please address soon' : 'HIGH PRIORITY';
    }

    return '';
  }

  /**
   * Format procedure reference based on language level
   */
  formatProcedureReference(procedureNumber: string, level: LanguageLevel): string {
    if (level <= 2) {
      const titles: Record<string, string> = {
        '5.7': 'non-conforming product procedure',
        '3.11': 'corrective action procedure',
        '3.9': 'traceability procedure',
        '5.8': 'foreign body control procedure',
        '4.7': 'maintenance procedure',
        '5.6': 'calibration procedure'
      };
      return titles[procedureNumber] ?? `procedure ${procedureNumber}`;
    }

    return `Procedure ${procedureNumber}`;
  }
}
