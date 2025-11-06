# NCA Form Validation Demo

This document demonstrates the validation features implemented in the NCA form.

## Test the Form

1. **Start the development server:**

   ```bash
   cd C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\ohisee-reports
   npm run dev
   ```

2. **Navigate to:** <http://localhost:3008/nca/new>

---

## Validation Scenarios to Test

### Scenario 1: Character Counter - NC Description

**Test Steps:**

1. Go to Section 4: NC Description
2. Start typing in the textarea
3. **Observe:** Character counter updates in real-time
4. **Expected Behavior:**
   - Counter shows "X / 100"
   - Red text when < 50 characters
   - Yellow text when 50-99 characters
   - Green text when ≥ 100 characters

**Try typing:**

- "Short text" → Red counter (< 50 chars)
- 50+ character sentence → Yellow counter
- 100+ character paragraph → Green counter ✓

---

### Scenario 2: Product Description Validation

**Test Steps:**

1. Go to Section 3: Supplier & Product Information
2. Try to submit form with empty Product Description
3. **Expected:** Error message "Product description must be at least 10 characters"
4. Type "Test" (4 chars)
5. **Expected:** Still shows error
6. Type "Test Product Description" (10+ chars)
7. **Expected:** Error clears, counter turns green ✓

---

### Scenario 3: Machine Status Required

**Test Steps:**

1. Go to Section 5: Machine Status (CRITICAL)
2. Leave both radio buttons unselected
3. Try to submit form
4. **Expected:** Submit button is disabled OR error message appears
5. Click "MACHINE DOWN"
6. **Expected:**
   - Two new fields appear:
     - Machine Down Since (timestamp)
     - Estimated Downtime (minutes)
   - Red left border indicates critical section
7. Leave timestamp empty and try to submit
8. **Expected:** "Machine down since timestamp is required when machine is down"

---

### Scenario 4: Cross-Contamination Conditional Logic

**Test Steps:**

1. Go to Section 7: Immediate Correction
2. Select "Cross Contamination: NO"
3. **Expected:** Back tracking field NOT shown
4. Select "Cross Contamination: YES"
5. **Expected:**
   - "Back Tracking Person *" field appears
   - Yellow left border indicates required conditional field
6. Leave field empty and try to submit
7. **Expected:** "Back tracking person is required when cross-contamination is detected"
8. Fill in name
9. **Expected:** Error clears ✓

---

### Scenario 5: Rework Disposition Validation

**Test Steps:**

1. Go to Section 8: Disposition
2. Select "Rework" disposition
3. **Expected:**
   - "Rework Instruction *" field appears with validation
   - Blue left border indicates required conditional field
4. Type "Fix it" (6 chars)
5. **Expected:** Error "Rework instruction must be at least 20 characters when rework is selected"
6. Type complete instruction (20+ chars)
7. **Expected:** Error clears ✓

---

### Scenario 6: Form Submission Flow

**Test Steps:**

1. Fill out form with ALL required fields:
   - Section 2: Select NC Type (any option)
   - Section 3: Product Description (10+ chars)
   - Section 4: NC Description (100+ chars)
   - Section 5: Machine Status (select one)
2. **Observe:** Submit button becomes enabled when form is valid
3. Click "Submit"
4. **Expected:**
   - Button text changes to "Submitting..."
   - Button becomes disabled
   - After 1 second: Success message appears (green banner)
   - Form clears automatically
   - Success message disappears after 3 seconds

---

## Visual Indicators Guide

### Color-Coded Borders

- **Red:** Critical machine down fields
- **Yellow:** Cross-contamination conditional fields
- **Blue:** Rework disposition conditional fields

### Character Counter Colors

- **Red:** Below 50% of minimum requirement
- **Yellow:** Between 50-99% of minimum requirement
- **Green:** Meets minimum requirement ✓

### Button States

- **Disabled (gray):** Form invalid or submitting
- **Enabled (blue):** Form valid and ready to submit
- **Loading:** Shows "Submitting..." text

---

## Validation Rules Summary

| Field | Rule | Error Message |
|-------|------|---------------|
| NC Type | Required | "Please select a non-conformance type" |
| Product Description | Min 10 chars | "Product description must be at least 10 characters" |
| NC Description | Min 100 chars | "Description must be at least 100 characters for compliance" |
| Machine Status | Required | "Machine status must be explicitly selected" |
| Machine Down Since | Required if down | "Machine down since timestamp is required when machine is down" |
| Estimated Downtime | Required if down, > 0 | "Estimated downtime is required when machine is down" |
| Back Tracking Person | Required if cross-contam | "Back tracking person is required when cross-contamination is detected" |
| Rework Instruction | Min 20 chars if rework | "Rework instruction must be at least 20 characters when rework is selected" |

---

## Test Results

Run all tests to verify no regressions:

```bash
npx playwright test --reporter=list
```

**Expected Output:**

```
45 passed (X.Xs)
```

All existing tests should pass without modification.

---

## Developer Notes

### TypeScript Type Safety

All form fields are fully typed:

```typescript
// Inferred from Zod schema
type NCAFormData = z.infer<typeof ncaFormSchema>;

// React Hook Form with type safety
const { register, watch, setValue } = useForm<NCAFormData>({
  resolver: zodResolver(ncaFormSchema),
});
```

### Validation Architecture

```
User Input → React Hook Form → Zod Schema → Validation Rules → Error Messages → UI Update
                ↓
         watch() updates
                ↓
    Conditional field logic
```

### Performance Considerations

- Character counters use `watch()` which updates on every keystroke
- Validation runs in `onChange` mode for real-time feedback
- Memoization applied to counter status calculations
- No debouncing currently (add if performance issues arise)

---

## Future Enhancements

1. **Database Integration**
   - Connect to Supabase
   - Save drafts to database
   - Handle file uploads

2. **Advanced Validation**
   - Async validation (check duplicate NCA numbers)
   - File size/type validation
   - Cross-field validation (date ranges)

3. **UX Improvements**
   - Scroll to first error on submit
   - Field-level success indicators
   - Progress bar for multi-section forms

4. **Testing**
   - Add behavior tests for validation rules
   - Test conditional logic
   - E2E submission tests
