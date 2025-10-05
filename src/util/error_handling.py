"""Enhanced error handling utilities for CLI tools."""
from typing import Optional, List, Dict, Any


def error_response(
    message: str,
    hint: Optional[str] = None,
    suggested_action: Optional[str] = None,
    similar_keys: Optional[List[str]] = None,
    error_code: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a standardized error response with helpful context.
    
    Args:
        message: Primary error message
        hint: Actionable suggestion for fixing the error
        suggested_action: Tool or command to run next
        similar_keys: List of similar/alternative keys (for "key not found" errors)
        error_code: Machine-readable error code
    
    Returns:
        Dict with error information
    """
    response = {
        "ok": False,
        "error": message
    }
    
    if hint:
        response["hint"] = hint
    if suggested_action:
        response["suggested_action"] = suggested_action
    if similar_keys:
        response["similar_keys"] = similar_keys
    if error_code:
        response["error_code"] = error_code
    
    return response


def success_response(
    result: Any,
    paths: Optional[List[str]] = None,
    provenance: Optional[List[Dict]] = None,
    metrics: Optional[Dict] = None,
    format_type: str = "concise"
) -> Dict[str, Any]:
    """
    Create a standardized success response.
    
    Args:
        result: Primary result data
        paths: File paths created/used
        provenance: Data sources
        metrics: Performance metrics
        format_type: Output format
    
    Returns:
        Dict with success information
    """
    response = {
        "ok": True,
        "result": result
    }
    
    if paths:
        response["paths"] = paths
    if provenance:
        response["provenance"] = provenance
    if metrics:
        response["metrics"] = metrics
    
    response["format"] = format_type
    
    return response


def key_not_found_error(key: str, available_keys: List[str]) -> Dict[str, Any]:
    """Error for missing JSON keys with suggestions."""
    # Find similar keys (simple string matching)
    similar = []
    key_lower = key.lower()
    
    for k in available_keys:
        k_lower = k.lower()
        # Exact substring match
        if key_lower in k_lower or k_lower in key_lower:
            similar.append(k)
        # Check for common variations
        elif key_lower.replace('_', '') in k_lower.replace('_', ''):
            similar.append(k)
    
    similar = similar[:3]  # Limit to top 3
    
    hint_parts = ["Use mf-json-inspect to see all available keys."]
    if similar:
        hint_parts.append(f"Try: {', '.join(similar)}")
    
    return error_response(
        message=f"Key '{key}' not found in JSON",
        hint=" ".join(hint_parts),
        suggested_action="mf-json-inspect",
        similar_keys=similar,
        error_code="KEY_NOT_FOUND"
    )


def invalid_format_error(expected: str, received: str, example: str = None) -> Dict[str, Any]:
    """Error for format mismatches."""
    hint = f"Expected {expected}, received {received}"
    if example:
        hint += f". Example: {example}"
    
    return error_response(
        message=f"Invalid format: expected {expected}",
        hint=hint,
        error_code="INVALID_FORMAT"
    )


def missing_field_error(field: str, required_fields: List[str]) -> Dict[str, Any]:
    """Error for missing required fields."""
    return error_response(
        message=f"Missing required field: {field}",
        hint=f"Required fields: {', '.join(required_fields)}",
        error_code="MISSING_FIELD"
    )


def division_by_zero_error(context: str = None) -> Dict[str, Any]:
    """Error for division by zero."""
    message = "Division by zero"
    if context:
        message += f": {context}"
    
    return error_response(
        message=message,
        hint="Check that denominator is not zero",
        error_code="DIVISION_BY_ZERO"
    )


def empty_data_error(data_type: str = "data") -> Dict[str, Any]:
    """Error for empty data."""
    return error_response(
        message=f"Empty {data_type} provided",
        hint=f"Provide non-empty {data_type}",
        error_code="EMPTY_DATA"
    )
