# Testing Issues Log

## Import Resolution Issues with Vitest/TypeScript

### Issue Description
Multiple test files are failing to load with the error:
```
Error: Failed to load url ../../src/types/events (resolved id: ../../src/types/events) in [test-file]. Does the file exist?
```

### Affected Files
- `tests/EventBusImpl/02-event-publishing.unit.test.ts`
- `tests/EventBusImpl/03-event-subscription.unit.test.ts` 
- `tests/GameEventHandlerImpl/01-initialization.unit.test.ts` (when importing enums directly)

### Working vs Failing Cases
✅ **Working**: `tests/EventBusImpl/01-initialization.unit.test.ts` - imports the same path successfully
❌ **Failing**: Other test files with identical import syntax

### Technical Details
- Path `../../src/types/events.d.ts` exists and has correct permissions
- Import works for type-only imports in some files
- Import fails when importing enums directly (`import { EventCategory, TargetType } from ...`)
- Issue may be related to TypeScript module resolution in Vitest environment

### Current Status
- EventBusImpl: 10/10 tests passing (initialization file works)
- GameEventHandlerImpl: Core implementation completed, hits import issues when testing

### Workaround Attempted
- Path aliases (`@types/events`) - failed
- File extensions (`.js`) - failed
- Clearing Vite cache - no effect
- Direct imports vs type imports - type imports work better

### Next Steps for Investigation
1. Check TypeScript configuration for module resolution
2. Review Vitest configuration for TypeScript handling
3. Consider creating simple barrel exports to work around issue
4. Investigate if issue is specific to enum imports vs type imports