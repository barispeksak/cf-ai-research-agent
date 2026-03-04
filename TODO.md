# TODO — CF AI Research Agent

## Stage 1: Project Setup
- [ ] 1.1 Create package.json with wrangler, typescript, @cloudflare/workers-types
- [ ] 1.2 Create wrangler.toml with AI binding, DO binding, migration
- [ ] 1.3 Create tsconfig.json for Workers TypeScript
- [ ] 1.4 Run npm install
- [ ] 1.5 Create src/ directory
- [ ] 1.6 **TEST**: Verify wrangler can parse config (`npx wrangler whoami` or similar)

## Stage 2: Durable Object (Session State)
- [ ] 2.1 Define TypeScript interfaces for message and research state
- [ ] 2.2 Implement ResearchSession DO class with constructor
- [ ] 2.3 Implement POST /messages handler (add message, cap at 30)
- [ ] 2.4 Implement GET /messages handler (return history)
- [ ] 2.5 Implement POST /state handler (update research state)
- [ ] 2.6 Implement GET /state handler (return current state)
- [ ] 2.7 Implement DELETE /reset handler (clear session)
- [ ] 2.8 **TEST**: TypeScript compiles cleanly

## Stage 3: Agent Logic
- [ ] 3.1 Define types for AI binding and function signatures
- [ ] 3.2 Implement decomposeQuestion() — break topic into sub-questions
- [ ] 3.3 Implement researchSubQuestion() — research one sub-question
- [ ] 3.4 Implement synthesizeReport() — combine findings into report
- [ ] 3.5 Implement handleFollowUp() — answer follow-up with context
- [ ] 3.6 **TEST**: TypeScript compiles cleanly

## Stage 4: Worker Route Handler
- [ ] 4.1 Set up Worker entry with Env interface and CORS helpers
- [ ] 4.2 Implement GET / route (serve frontend)
- [ ] 4.3 Implement POST /api/research route (full research flow)
- [ ] 4.4 Implement POST /api/followup route
- [ ] 4.5 Implement GET /api/session/:id route
- [ ] 4.6 Implement DELETE /api/session/:id route
- [ ] 4.7 Export ResearchSession DO from index.ts
- [ ] 4.8 **TEST**: TypeScript compiles, wrangler dev starts

## Stage 5: Frontend
- [ ] 5.1 HTML structure with semantic elements
- [ ] 5.2 CSS: professional dark theme, typography, layout
- [ ] 5.3 CSS: animations, loading states, responsiveness
- [ ] 5.4 JS: research flow (submit topic, show progress, render report)
- [ ] 5.5 JS: follow-up chat functionality
- [ ] 5.6 JS: session persistence via URL hash
- [ ] 5.7 JS: markdown rendering
- [ ] 5.8 **TEST**: wrangler dev, frontend loads, visual check

## Stage 6: Integration Test & Fix
- [ ] 6.1 Run wrangler dev, verify frontend loads
- [ ] 6.2 Test research flow end-to-end
- [ ] 6.3 Test follow-up questions
- [ ] 6.4 Test session persistence on refresh
- [ ] 6.5 Fix any runtime errors
- [ ] 6.6 **TEST**: Full flow works without errors

## Stage 7: Deploy
- [ ] 7.1 Run npx wrangler deploy
- [ ] 7.2 Verify deployed URL works
- [ ] 7.3 Fix any deployment errors
- [ ] 7.4 **TEST**: Live URL accessible and functional

## Stage 8: Documentation
- [ ] 8.1 Create README.md with all required sections
- [ ] 8.2 Create PROMPTS.md template
- [ ] 8.3 **TEST**: Docs render properly in markdown
