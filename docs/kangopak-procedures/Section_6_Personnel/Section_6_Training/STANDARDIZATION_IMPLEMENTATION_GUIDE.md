# BRCGS Training Modules Standardization Implementation Guide

**Version:** 1.0  
**Date:** September 2025  
**Purpose:** Systematic standardization of all 36 BRCGS training modules for Kangopak

## Implementation Status

**COMPLETED (7 modules):**
✅ BRCGS_Training_6.3_Personal_Hygiene.md  
✅ BRCGS_Training_3.12_Incident_Management.md  
✅ BRCGS_Training_1.1.1_Product_Safety_Culture.md  
✅ BRCGS_Training_6.3.1_Health_Illness_Reporting.md  
✅ BRCGS_Training_1.1.1_Hazard_Risk_Awareness.md  
✅ BRCGS_Training_5.8_Foreign_Body_Control.md  
✅ pest_activity_reporting.md (partially completed)

**REMAINING (29 modules):** Need systematic application of standardization template

## Standardization Template

For each remaining module, apply the following changes:

### 1. Header Structure Changes
**FIND:** 
```markdown
# [Training Title]

**Module:** [Module Name]  
**Audience:** [Audience]  
**Duration:** [X] minutes  
**Frequency:** [Frequency]  
**BRCGS Reference:** [References]  
**Kangopak Procedure:** [Procedure] Rev [X]
```

**REPLACE WITH:**
```markdown
**Kangopak Procedure:** [ProcedureNumber]

# [Training Title]

**Module:** [Module Name]  
**Audience:** [Audience]  
**Frequency:** [Frequency]  
**BRCGS Reference:** [References]  
**Kangopak Procedure:** [ProcedureNumber] BRCGS [Procedure Name]
```

### 2. Content Replacements
- **"Food Safety"** → **"Product Safety"** (global replacement)
- **"BRC "** → **"BRCGS "** (standalone BRC only, not in procedure numbers)
- Remove **"Rev [Number]"** from all procedure references

### 3. Legal Requirements Section Updates
**REMOVE UK Legal References:**
- Food Safety Act 1990 (UK)
- Food Hygiene (England) Regulations 2006
- General Product Safety Regulations 2005
- EU Regulation 178/2002

**REPLACE WITH South African Legal Requirements:**
- Foodstuffs, Cosmetics and Disinfectants Act 54 of 1972 (South Africa)
- Regulations Governing General Hygiene Requirements for Food Premises and the Transport of Food (R962 of 2012)
- Consumer Protection Act 68 of 2008 (South Africa)
- National Health Act 61 of 2003 (South Africa)
- Occupational Health and Safety Act 85 of 1993 (South Africa)
- Basic Conditions of Employment Act 75 of 1997 (South Africa)
- Companies Act 71 of 2008 (South Africa)

### 4. Remove Training Signature Lines
**FIND and REMOVE:**
```markdown
---
*Training completed: Date _______ Trainer signature _______ Trainee signature _______*
```

### 5. File Renaming Convention
**Pattern:** `BRCGS_Training_[ProcedureNumber]_[ShortTopic].md`

## Complete Module Mapping and New Names

| Current Filename | Procedure | New Filename | Status |
|------------------|-----------|--------------|--------|
| personal_hygiene_standards.md | 6.3 | BRCGS_Training_6.3_Personal_Hygiene.md | ✅ |
| incident_management_withdrawal.md | 3.12 | BRCGS_Training_3.12_Incident_Management.md | ✅ |
| product_safety_culture.md | 1.1.1 | BRCGS_Training_1.1.1_Product_Safety_Culture.md | ✅ |
| health_illness_reporting.md | 6.3.1 | BRCGS_Training_6.3.1_Health_Illness_Reporting.md | ✅ |
| hazard_risk_awareness.md | 1.1.1 | BRCGS_Training_1.1.1_Hazard_Risk_Awareness.md | ✅ |
| foreign_body_control.md | 5.8 | BRCGS_Training_5.8_Foreign_Body_Control.md | ✅ |
| pest_activity_reporting.md | 4.11 | BRCGS_Training_4.11_Pest_Activity.md | 🔄 |
| supplier_performance_monitoring.md | 3.6 | BRCGS_Training_3.6_Supplier_Performance.md | ⚠️ |
| specification_management.md | 3.4 | BRCGS_Training_3.4_Specification_Management.md | ⚠️ |
| non_conformance_management.md | 3.11 | BRCGS_Training_3.11_Non_Conformance.md | ⚠️ |
| advanced_food_safety_training.md | 2.2 | BRCGS_Training_2.2_Advanced_Product_Safety.md | 🔄 |
| ccp_monitoring_verification.md | 2.2 | BRCGS_Training_2.2_CCP_Monitoring.md | ⚠️ |
| site_security_defence.md | 4.4 | BRCGS_Training_4.4_Site_Security.md | ⚠️ |
| manufacturing_process_control.md | 5.3 | BRCGS_Training_5.3_Process_Control.md | ⚠️ |
| document_control_training.md | 3.2 | BRCGS_Training_3.2_Document_Control.md | ⚠️ |
| quality_system_management.md | 3.1 | BRCGS_Training_3.1_Quality_System.md | ⚠️ |
| work_instructions_adherence.md | 1.1.1 | BRCGS_Training_1.1.1_Work_Instructions.md | ⚠️ |
| raw_material_specifications.md | 5.3 | BRCGS_Training_5.3_Raw_Materials.md | ⚠️ |
| calibration_verification.md | 5.6 | BRCGS_Training_5.6_Calibration.md | ⚠️ |
| internal_auditor_training.md | 3.3 | BRCGS_Training_3.3_Internal_Auditor.md | ⚠️ |
| traceability_system.md | 3.9 | BRCGS_Training_3.9_Traceability.md | ⚠️ |
| regulatory_compliance_updates.md | 1.1 | BRCGS_Training_1.1_Regulatory_Compliance.md | ⚠️ |
| employee_responsibilities.md | 1.1.1 | BRCGS_Training_1.1.1_Employee_Responsibilities.md | ⚠️ |
| product_safety_responsibilities.md | 1.1.1 | BRCGS_Training_1.1.1_Product_Safety_Responsibilities.md | ⚠️ |
| reporting_unsafe_products.md | 1.1.1 | BRCGS_Training_1.1.1_Unsafe_Products.md | ⚠️ |
| continuous_competency.md | 6.1 | BRCGS_Training_6.1_Continuous_Competency.md | ⚠️ |
| general_induction.md | 6.1 | BRCGS_Training_6.1_General_Induction.md | ⚠️ |
| counting_scales_operation.md | 5.6.1 | BRCGS_Training_5.6.1_Counting_Scales.md | ⚠️ |
| equipment_settings_changes.md | 5.3 | BRCGS_Training_5.3_Equipment_Settings.md | ⚠️ |
| temporary_modifications_machinery.md | 4.7 | BRCGS_Training_4.7_Temporary_Modifications.md | ⚠️ |
| safe_use_electric_tools.md | 4.7 | BRCGS_Training_4.7_Electric_Tools.md | ⚠️ |
| protective_clothing_laundry.md | 6.3 | BRCGS_Training_6.3_Protective_Clothing.md | ⚠️ |
| glass_brittle_plastic_control.md | 5.8 | BRCGS_Training_5.8_Glass_Brittle_Plastic.md | ⚠️ |
| housekeeping_cleaning_standards.md | 4.9 | BRCGS_Training_4.9_Housekeeping.md | ⚠️ |
| contractor_visitor_control.md | 4.4 | BRCGS_Training_4.4_Contractor_Visitor.md | ⚠️ |
| emergency_procedures_response.md | Emergency | BRCGS_Training_Emergency_Response.md | ⚠️ |

**Legend:**
- ✅ Completed
- 🔄 In Progress  
- ⚠️ Pending

## Implementation Commands for Each Module

For each remaining module, execute these steps:

1. **Apply content changes:** Use MultiEdit tool to update headers and content
2. **Remove signature lines:** Remove training completion signatures
3. **Update legal requirements:** Replace UK with South African legislation
4. **Rename file:** Move to new naming convention

## Batch Implementation Approach

### Priority Order:
1. **Tier 1 Mandatory (4 modules)** - ✅ COMPLETED
2. **Tier 2 Critical Process (10 modules)** - 3 completed, 7 pending
3. **Tier 3 Operational (7 modules)** - 0 completed, 7 pending
4. **Tier 4 Team Responsibility (6 modules)** - 0 completed, 6 pending
5. **Tier 5 Additional Operational (9 modules)** - 0 completed, 9 pending

## Quality Assurance Checklist

For each completed module, verify:
- ✅ Kangopak procedure number header added
- ✅ Duration line removed
- ✅ Rev numbers removed from procedure references
- ✅ "Food Safety" → "Product Safety" replacements applied
- ✅ "BRC" → "BRCGS" replacements applied (standalone only)
- ✅ UK legal requirements replaced with South African equivalents
- ✅ Training signature lines removed
- ✅ File renamed to new convention
- ✅ Content structure and formatting preserved
- ✅ BRCGS clause references maintained
- ✅ Procedure numbers match Kangopak manual

## Final Validation

After all modules are processed:
1. **Update README.md** with all new file names
2. **Verify all 36 modules** follow standardized format
3. **Test all internal links** in README work with new file names
4. **Validate legal requirements** are appropriate for South African context
5. **Confirm procedure numbers** match latest Kangopak BRCGS manual

## Implementation Timeline

**Completed:** 7 modules (19.4%)  
**Remaining:** 29 modules (80.6%)  
**Estimated completion:** 4-6 hours for systematic processing

This guide provides the systematic approach needed to complete the standardization of all 36 BRCGS training modules for Kangopak, ensuring consistency with South African legal requirements and current BRCGS standards.