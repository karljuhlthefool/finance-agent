"""Security hooks for the agent."""
import json
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, Optional
import re
import subprocess


class AgentHooks:
    """Hooks for PreToolUse and PostToolUse events."""
    
    def __init__(self, workspace: Path, auto_save_reports: bool = True):
        self.workspace = workspace
        self.log_path = workspace / "logs" / "tool_uses.jsonl"
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        self.auto_save_reports = auto_save_reports
        self.final_message: Optional[str] = None
    
    def log(self, msg: str) -> None:
        """Log message to JSONL file."""
        try:
            entry = {
                "ts": datetime.now().isoformat(),
                "msg": msg
            }
            with open(self.log_path, "a") as f:
                f.write(json.dumps(entry) + "\n")
        except Exception:
            pass
    
    def pre_tool_guard(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Guard hook for PreToolUse.
        Returns: { "continue": True } or { "decision": "block", "reason": "..." }
        """
        payload = json.dumps(tool_input)
        
        # Block dangerous bash commands
        if tool_name == "Bash":
            dangerous_patterns = [
                r'rm\s+-rf\s+/',
                r'mkfs',
                r'shutdown',
                r':?\(\)\s*\{'  # fork bomb
            ]
            
            for pattern in dangerous_patterns:
                if re.search(pattern, payload, re.IGNORECASE):
                    return {
                        "decision": "block",
                        "reason": "Dangerous shell command blocked"
                    }
        
        # Enforce /workspace writes for Write tool
        if tool_name == "Write":
            if '"/workspace/' not in payload and "'/workspace/" not in payload:
                return {
                    "decision": "block",
                    "reason": "Writes must stay under /workspace"
                }
        
        return {"continue": True}
    
    def post_tool_logger(self, tool_name: str, tool_input: Dict[str, Any], 
                        tool_response: Any) -> Dict[str, Any]:
        """
        Logger hook for PostToolUse.
        Returns: { "continue": True }
        """
        input_str = json.dumps(tool_input)[:400]
        response_str = str(tool_response)[:400]
        
        self.log(f"[{tool_name}] input={input_str} result={response_str}")
        
        return {"continue": True}
    
    def save_final_report(self, content: str, ticker: Optional[str] = None, 
                         title: Optional[str] = None) -> Optional[str]:
        """
        Save final agent report to persistent storage using mf-report-save.
        Returns path to saved report or None if save failed.
        """
        if not self.auto_save_reports or not content:
            return None
        
        # Skip if content is too short (likely not a real report)
        if len(content.split()) < 50:
            return None
        
        try:
            # Prepare input for mf-report-save
            save_input = {
                "content": content,
                "type": "analysis",
                "ticker": ticker,
                "title": title or "Agent Analysis"
            }
            
            # Find mf-report-save tool
            project_root = self.workspace.parent.parent
            tool_path = project_root / "bin" / "mf-report-save"
            
            if not tool_path.exists():
                return None
            
            # Call mf-report-save
            result = subprocess.run(
                [str(tool_path)],
                input=json.dumps(save_input),
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                output = json.loads(result.stdout)
                if output.get('ok'):
                    report_path = output['result']['report_path']
                    self.log(f"Auto-saved final report to: {report_path}")
                    return report_path
            
            return None
            
        except Exception as e:
            self.log(f"Failed to auto-save report: {str(e)}")
            return None
