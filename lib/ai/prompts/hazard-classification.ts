/**
 * Hazard Classification Prompt Template
 * Classifies issues into 11 BRCGS hazard types
 *
 * Note: Does not implement PromptTemplate interface as it uses
 * a specialized signature (string parameter instead of AnalysisContext)
 */

export class HazardClassificationPrompt {
  readonly name = 'hazard-classification';
  readonly version = '1.0';

  build(description: string): string {
    return `You are a BRCGS food safety hazard classification expert.

Analyze the following issue description and classify it into one of the 11 BRCGS hazard types.

## ISSUE DESCRIPTION
${description}

## BRCGS HAZARD TYPES
1. **microbiological** - Bacteria, viruses, parasites, pathogens
2. **chemical** - Cleaning chemicals, pesticides, additives, allergens in wrong product
3. **physical** - General physical contamination not covered by specific types below
4. **allergen** - Cross-contamination of allergen into non-allergen product
5. **radiological** - Radioactive contamination (rare in food manufacturing)
6. **nutritional** - Incorrect nutritional content, missing nutrients
7. **other-biological** - Toxins, mycotoxins, natural poisons
8. **metal-contamination** - Metal fragments, metal shavings, metal foreign bodies
9. **glass-contamination** - Glass fragments, broken glass
10. **foreign-body** - Other foreign objects (plastic, wood, stone, insects, hair)
11. **cross-contamination** - Transfer of hazard from one product/area to another

## SEVERITY LEVELS
- **low**: Minor quality issue, no health impact
- **medium**: Quality issue with potential consumer complaint
- **high**: Health impact possible but unlikely to be serious
- **critical**: Serious health impact likely (choking, injury, illness)

## LIKELIHOOD LEVELS
- **rare**: Has never happened, very unlikely
- **unlikely**: Has happened once, low probability
- **possible**: Has happened occasionally, medium probability
- **likely**: Happens regularly, high probability
- **certain**: Happens frequently, very high probability

## RISK CALCULATION
Risk Level = Severity × Likelihood
- Severity: low=1, medium=2, high=3, critical=4
- Likelihood: rare=1, unlikely=2, possible=3, likely=4, certain=5
- Risk Level Range: 1-20

## OUTPUT FORMAT
Return ONLY a JSON object with this exact structure:

\`\`\`json
{
  "hazard_type": "microbiological|chemical|physical|allergen|radiological|nutritional|other-biological|metal-contamination|glass-contamination|foreign-body|cross-contamination",
  "severity": "low|medium|high|critical",
  "likelihood": "rare|unlikely|possible|likely|certain",
  "risk_level": 12,
  "control_measures": [
    "Specific control measure 1",
    "Specific control measure 2",
    "Specific control measure 3"
  ],
  "brcgs_section": "5.8",
  "confidence": "high|medium|low"
}
\`\`\`

## CLASSIFICATION GUIDANCE

### Keywords → Hazard Type Mapping:
- **metal-contamination**: "metal", "metal fragment", "metal shaving", "swarf", "bolt", "screw", "wire"
- **glass-contamination**: "glass", "broken glass", "glass fragment", "shattered"
- **foreign-body**: "hair", "plastic", "wood", "stone", "insect", "foreign object", "contamination" (general)
- **microbiological**: "bacteria", "mold", "spoilage", "contamination" (biological), "pathogen"
- **allergen**: "allergen", "cross-contact", "undeclared allergen", "allergen residue"
- **chemical**: "chemical", "cleaning agent", "sanitizer", "pesticide", "lubricant"
- **cross-contamination**: "cross-contamination", "transfer", "spread", "back tracking"

### BRCGS Section References:
- 5.8: Foreign body control (metal, glass, foreign-body types)
- 5.7: Non-conforming product control (general quality)
- 3.4: Allergen management
- 5.3: Hygiene (microbiological)
- 5.4: Process control (chemical, nutritional)

### Control Measures Examples:
- Metal: "Metal detector verification", "Tool control (shadow board)", "Swarf mat usage", "Equipment inspection"
- Glass: "Glass register update", "Area inspection", "Product isolation", "Breakage investigation"
- Foreign body: "Line clearance", "Hygiene audit", "Training reinforcement", "Supplier notification"
- Microbiological: "Temperature monitoring", "Cleaning verification", "Environmental testing", "Product testing"
- Allergen: "Allergen cleaning verification", "Line clearance", "Batch segregation", "Labeling verification"

## IMPORTANT
- Be specific in control measures - avoid generic statements
- Confidence should be "high" only if keywords clearly match hazard type
- If uncertain between types, choose most conservative (highest risk) classification
- Risk level must be mathematically correct (severity × likelihood)
- BRCGS section must be accurate for the hazard type

Analyze the description and return the classification JSON now.`;
  }
}
