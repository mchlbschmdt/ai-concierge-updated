
# Fix Sky Replacement Bleeding Into Buildings

## Problem

The Stability AI sky replacement is modifying buildings and other non-sky elements because:
1. The `search_prompt` includes the vague term `"atmosphere, air above horizon"` which matches buildings near the skyline
2. The `grow_mask` value of `3` expands the replacement area further into non-sky regions
3. The negative prompt doesn't explicitly protect architectural elements

## Solution

Two targeted changes in `supabase/functions/process-image/index.ts` (sky replacement step, ~line 381):

### Change 1: Tighten the search_prompt
Replace:
```
'sky, clouds, atmosphere, air above horizon'
```
With:
```
'sky, clouds'
```

This narrows what Stability AI identifies as "the thing to replace" to just the sky and clouds, avoiding buildings, trees, and other horizon elements.

### Change 2: Reduce grow_mask
Replace:
```
form.append('grow_mask', '3');
```
With:
```
form.append('grow_mask', '1');
```

A smaller mask growth prevents the replacement zone from bleeding into adjacent structures.

### Change 3: Add architectural preservation to negative prompt
Update the negative prompt to explicitly protect buildings:
```
'blurry, fake, cartoon, nuclear, neon, oversaturated sky, watermark, text, artifacts, changed buildings, altered architecture, modified structures'
```

## Files Changed
- `supabase/functions/process-image/index.ts` -- 3 small edits on lines 381-384
- Edge function will be redeployed
