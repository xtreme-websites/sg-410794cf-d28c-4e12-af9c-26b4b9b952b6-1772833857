# Migration Plan: Lovable to Softgen + Gemini (Final)

## 1. Project Status
- **Codebase**: Migrated from Lovable.
- **Backend**: Supabase Edge Functions currently depend on Lovable Gateway.
- **Goal**: Remove Lovable dependency and use direct Gemini API.

## 2. Technical Implementation: Gemini API Integration

We need to refactor 4 Edge Functions:
1. `trending-topics`
2. `media-presence-audit`
3. `refine-press-release`
4. `generate-press-release`

### API Implementation Details
**Target Model**: `gemini-2.5-flash`

**Request Structure (Google Generative Language API):**
- **URL**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
- **Headers**: `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "contents": [{
      "parts": [{ "text": "YOUR PROMPT HERE" }]
    }]
  }
  ```
- **Response Parsing**: 
  - Change `data.choices[0].message.content` → `data.candidates[0].content.parts[0].text`

## 3. Maintenance Tasks (Lint Fixes)
While refactoring, we will also fix these existing issues:
- **PRDashboard.tsx**: Fix explicit `any` type at line 226.
- **ui/command.tsx & textarea.tsx**: Fix empty interface declarations.
- **tailwind.config.ts**: Replace `require()` with `import`.

## 4. Execution Steps (For Creative/Standard Mode)
1. **User**: Switch to Creative/Standard Mode.
2. **Softgen**: 
   - Update all 4 Edge Functions with the new Gemini fetch logic.
   - Fix linting errors.
   - Verify functionality.
