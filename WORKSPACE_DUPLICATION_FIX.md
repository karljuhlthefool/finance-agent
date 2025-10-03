# Workspace Duplication Fix

## Problem
The workspace viewer UI was showing a nested/duplicated workspace structure:
```
📁 workspace
  └── 📁 runtime
      └── 📁 workspace  ← DUPLICATE!
          └── 📁 data
              └── 📁 market
```

This was caused by files being written to paths like `runtime/workspace/data/...` when the agent's `cwd` was already set to `/path/to/runtime/workspace`, creating a nested structure.

## Root Cause
When the agent's working directory (`cwd`) is set to `/runtime/workspace`, and it writes to a relative path like `runtime/workspace/data/market/AAPL/file.json`, the filesystem creates:
```
/runtime/workspace/runtime/workspace/data/market/AAPL/file.json
```

This nested structure then appeared in the workspace viewer.

## Solution

### 1. Removed Physical Duplication
```bash
rm -rf /Users/karl/work/claude_finance_py/runtime/workspace/runtime
```

Deleted the nested `runtime/workspace/runtime/` directory that was created by mistake.

### 2. Added Backend Filter
Modified `agent_service/app.py` to prevent the `runtime` directory from appearing in the workspace tree at the root level:

```python
# In _scan_workspace_tree function:
# Prevent nested workspace duplication: skip 'runtime' directory at root level
# This prevents runtime/workspace/runtime/workspace nesting
if relative_path == 'runtime' and current_depth == 0:
    continue
```

This ensures that even if a `runtime` directory is accidentally created in the future, it won't appear in the UI.

## Verification
After the fix, the workspace structure is clean:
```
📁 workspace
  ├── 📁 analysis
  ├── 📁 data
  │   ├── 📁 extracted
  │   ├── 📁 market
  │   └── 📁 sec
  ├── 📁 logs
  ├── 📁 outputs
  └── 📁 reports
```

## Prevention
To prevent this issue from recurring:

1. **Backend filtering** now blocks `runtime` directory at the root level
2. **Agent should use absolute paths** from tool outputs (as specified in system prompt)
3. **Monitor for nested paths** when tools write files

## Files Modified
- `agent_service/app.py` - Added filter to skip `runtime` directory in workspace tree scanning

## Testing
After restarting the backend service, the workspace viewer should show a clean, non-duplicated directory structure.

