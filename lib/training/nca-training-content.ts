/**
 * NCA Training Content
 * Based on BRCGS Training 3.11 Non-Conformance Management
 */

export interface TrainingSection {
  id: string;
  title: string;
  content: string;
  brcgsReference?: string;
  procedureReference?: string;
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  sections: TrainingSection[];
  checkpointQuestions: CheckpointQuestion[];
}

export interface CheckpointQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export const ncaTrainingModule: TrainingModule = {
  id: 'nca-training',
  title: 'Non-Conformance Management Training',
  description: 'Learn how to identify, control, and manage non-conforming materials according to BRCGS requirements',
  sections: [
    {
      id: 'understanding',
      title: 'Understanding Non-Conformance',
      content: `Non-conforming materials are products or raw materials that don't meet their agreed specifications. This includes:

**Raw materials:**
- Incorrect dimensions (thickness, width, length outside tolerances)
- Wrong material properties (incorrect strength, transparency, or barrier properties)
- Contamination (foreign matter, odours, or discoloration)
- Packaging defects (damaged packaging allowing contamination)
- Documentation issues (missing certificates, incorrect labelling)

**Finished products:**
- Dimensional failures (sizes outside customer specifications)
- Print defects (wrong colours, missing text, poor registration)
- Functional failures (sealing problems, barrier failures)
- Appearance defects (scratches, marks, or distortion)
- Contamination (foreign bodies or chemical contamination)

**Risks of Non-Conforming Materials:**
- Product safety risks: Food contamination, chemical migration, physical hazards, allergen cross-contamination
- Business risks: Customer complaints, product recalls, regulatory action, certification loss`,
      brcgsReference: 'BRCGS 3.11.1',
      procedureReference: 'Procedure 5.7'
    },
    {
      id: 'immediate-control',
      title: 'Immediate Control Measures',
      content: `When non-conforming materials are identified, immediate action is required:

**Identification and Segregation:**
- Clear identification: RED tags or labels clearly mark non-conforming materials
- Quarantine areas: Designated locations for non-conforming materials
- Physical barriers: Prevent accidental use or mixing
- Effective segregation: Separate storage away from conforming materials

**Communication Requirements:**
- Supervisor informed: Report discovery immediately
- Quality team alerted: Technical assessment required
- Production stopped: If ongoing process affected
- Documentation started: Begin non-conformance record

**Information to communicate:**
- Material identification: What material is non-conforming
- Nature of problem: How it fails to meet specification
- Quantity affected: How much material involved
- Potential impact: What products or customers affected
- Discovery circumstances: How and when problem found`,
      brcgsReference: 'BRCGS 3.11.1',
      procedureReference: 'Procedure 5.7 Section 7'
    },
    {
      id: 'decision-making',
      title: 'Decision-Making Process',
      content: `All non-conforming materials must be assessed by competent personnel with technical knowledge and appropriate authority.

**Four Possible Decisions:**

1. **Reject** - When there is a safety risk, quality failure, customer requirements not met, or regulatory non-compliance. Process includes immediate segregation, documentation, disposal arrangements, and supplier notification.

2. **Accept by Concession** - When there is a minor deviation with no safety impact, functional adequacy maintained, and customer agreement. Process includes risk assessment, customer approval if required, limited use restrictions, and documentation.

3. **Rework** - When the defect is correctable, economically viable, technically feasible, and quality assurance can be achieved. Process includes defined rework procedure, quality control verification, documentation, and re-inspection.

4. **Alternative Use** - When suitable for different application, grade down to lower specification products, internal use for trials/testing, or material recovery. Process includes suitability assessment, specification change, customer approval if required, and clear labelling.`,
      brcgsReference: 'BRCGS 3.11.2',
      procedureReference: 'Procedure 5.7 Section 8'
    },
    {
      id: 'documentation',
      title: 'Documentation Requirements',
      content: `All non-conformance decisions must be fully documented:

**Required Information:**
- Material identification: Batch numbers, quantities, specifications
- Non-conformance description: Exact nature of the problem
- Assessment details: Who assessed, when, and how
- Decision made: Reject, accept, rework, or alternative use
- Reasoning: Why this decision was appropriate
- Approval signatures: Competent person authorization
- Implementation: Actions taken to implement decision

**Record Keeping:**
- Non-conformance register: Central record of all incidents
- Individual records: Detailed file for each incident
- Trend analysis: Patterns in non-conformance types
- Corrective actions: Measures to prevent recurrence
- Customer notifications: Communications sent regarding incidents`,
      brcgsReference: 'BRCGS 3.11.2',
      procedureReference: 'Procedure 5.7'
    },
    {
      id: 'examples',
      title: 'Practical Examples',
      content: `**Good Non-Conformance Management ✓**
- Immediate action: "I found off-colour film and immediately stopped production and quarantined the material"
- Proper assessment: "The quality manager assessed the material and decided it could be used for non-food contact applications"
- Clear documentation: "We recorded the decision, reasoning, and customer approval for the alternative use"
- Prevention focus: "We investigated the root cause and implemented corrective actions to prevent recurrence"

**Poor Practices to Avoid ✗**
- Ignoring problems: "The colour is slightly off but probably no one will notice"
- Unauthorised decisions: "I decided we could use it anyway since we're behind schedule"
- Poor segregation: "I put it in the corner but didn't label it clearly"
- Missing documentation: "We sorted out the problem but didn't write anything down"`,
      procedureReference: 'Procedure 5.7'
    }
  ],
  checkpointQuestions: [
    {
      id: 'q1',
      question: 'What are the four possible decisions for non-conforming materials according to BRCGS 3.11.2?',
      options: [
        'Reject, Accept, Rework, Alternative Use',
        'Reject, Accept by Concession, Rework, Alternative Use',
        'Reject, Return, Rework, Discard',
        'Reject, Credit, Rework, Concession'
      ],
      correctAnswer: 1,
      explanation: 'The four decisions are: Reject, Accept by Concession, Rework, and Alternative Use. Each has specific criteria and processes.'
    },
    {
      id: 'q2',
      question: 'What immediate actions must be taken when non-conforming materials are identified?',
      options: [
        'Document it and continue production',
        'Effective identification and segregation to prevent use, notification of supervisor/quality team, documentation of the incident',
        'Move it to a corner and label it',
        'Contact the supplier immediately'
      ],
      correctAnswer: 1,
      explanation: 'Immediate actions include effective identification and segregation to prevent use, notification of supervisor/quality team, and documentation of the incident.'
    },
    {
      id: 'q3',
      question: 'Who can make decisions about non-conforming materials?',
      options: [
        'Any operator',
        'The warehouse team leader only',
        'The assessment and decision must be made by competent personnel with appropriate technical knowledge and authority',
        'The quality manager only'
      ],
      correctAnswer: 2,
      explanation: 'The assessment and decision must be made by competent personnel with appropriate technical knowledge and authority level.'
    }
  ]
};

