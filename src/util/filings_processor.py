"""SEC filings content processing utilities."""
import re
import html
from typing import List, Dict, Optional
from bisect import bisect_right


def clean_html_artifacts(text: str) -> str:
    """Clean HTML entities, unicode artifacts, and normalize whitespace."""
    # Remove zero-width and null characters; strip stray table artifacts
    text = text.replace("\u200b", "").replace("\x00", "").replace("---|", "")

    # Decode HTML entities comprehensively (named, decimal, hex)
    text = html.unescape(text)

    # Normalize non-breaking spaces
    text = text.replace("\xa0", " ")

    # Remove other common unicode artifacts
    text = text.replace("\u2019", "'").replace("\u2018", "'")  # Smart quotes
    text = text.replace("\u201c", '"').replace("\u201d", '"')  # Smart double quotes
    text = text.replace("\u2013", "-").replace("\u2014", "-")  # En/em dashes

    # Normalize common bullet glyphs to dash-space for consistency
    for bullet in ("•", "·", "‣", "∙"):
        text = text.replace(bullet, "- ")

    # Preserve newlines: collapse only spaces/tabs, not line breaks
    text = re.sub(r"[ \t]+", " ", text)
    # Trim spaces around newlines
    text = re.sub(r"[ \t]*\n[ \t]*", "\n", text)
    # Collapse 3+ consecutive blank lines to 2
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    return text


def split_into_sentences(text: str) -> List[str]:
    """Split text into sentences while handling common abbreviations."""
    text = re.sub(
        r"(?<!Mr)(?<!Mrs)(?<!Ms)(?<!Dr)(?<!\bU\.S)(?<!\bInc)(?<!\bCorp)(?<!\bLtd)\.\s+",
        ".<SPLIT>",
        text,
    )
    return [s.strip() for s in text.split("<SPLIT>") if s.strip()]


def get_sentence_context(
    sentences: List[str], target_index: int, context_size: int = 2
) -> str:
    """Extract surrounding context sentences for a given target sentence."""
    start_idx = max(0, target_index - context_size)
    end_idx = min(len(sentences), target_index + context_size + 1)
    return " ".join(sentences[start_idx:end_idx])


def extract_matches_with_context(text: str, pattern: str) -> List[Dict]:
    """Extract sentences matching pattern with context."""
    sentences = split_into_sentences(text)
    matches = []

    for i, sentence in enumerate(sentences):
        if re.search(f"(?i){pattern}", sentence):
            matches.append(
                {
                    "target_sentence": sentence,
                    "context": get_sentence_context(sentences, i),
                    "position": i,
                }
            )

    return matches


def format_matches_as_section(matches: List[Dict], section_name: str) -> Optional[str]:
    """Format matches into a section with XML tags."""
    if not matches:
        return None

    content = []
    for match in matches:
        content.append(
            f"Target Sentence: {match['target_sentence']}\nContext: {match['context']}\n"
        )

    return "<" + section_name + ">\n" + "\n".join(content) + "\n</" + section_name + ">"


def extract_section(text: str, pattern: str, clean: bool = True) -> Optional[str]:
    """Extract a section using regex pattern."""
    matches = re.finditer(pattern, text, re.DOTALL | re.IGNORECASE)
    relevant_text = []

    for match in matches:
        section_text = match.group(0)
        if clean:
            # Clean up the extracted text
            section_text = re.sub(r"\s+", " ", section_text)
            section_text = section_text.strip()
            if len(section_text) > 100:
                relevant_text.append(section_text)

    return relevant_text[0] if relevant_text else None


def extract_mda(text: str) -> Optional[str]:
    """Extract Management Discussion & Analysis section (Item 7)."""
    pattern = r"(?i)Item[^\n]*7\.[^\n]*Management\'s\s*Discussion.*?(?=Item[^\n]*7A|Item[^\n]*8)"
    section = extract_section(text, pattern)
    return f"<mda>\n{section}\n</mda>" if section else None


def extract_business(text: str) -> Optional[str]:
    """Extract Business section (Item 1)."""
    pattern = r"(?i)Item[^\n]*1\.[^\n]*Business.*?(?=Item[^\n]*1A|Item[^\n]*2)"
    section = extract_section(text, pattern)
    return f"<business>\n{section}\n</business>" if section else None


def extract_risk_factors(text: str) -> Optional[str]:
    """Extract Risk Factors section (Item 1A)."""
    pattern = r"(?i)Item[^\n]*1A\.[^\n]*Risk\s*Factors.*?(?=Item[^\n]*1B|Item[^\n]*2)"
    section = extract_section(text, pattern)
    return f"<risk_factors>\n{section}\n</risk_factors>" if section else None


def extract_financial_statements(text: str) -> Optional[str]:
    """Extract Financial Statements section (Item 8)."""
    pattern = (
        r"(?is)Item\s*8\.\s*Financial\s*Statements[\s\S]*?(?=\s*Item\s*9|\s*Item\s*7)"
    )
    section = extract_section(text, pattern)
    return (
        f"<financial_statements>\n{section}\n</financial_statements>"
        if section
        else None
    )


def extract_keyword_context(
    text: str, phrases: List[str], pre_window: int = 1000, post_window: int = 1000
) -> str:
    """
    For each exact phrase in `phrases`, find all occurrences (case-insensitive)
    in `text` and grab `pre_window` words before and `post_window` words after.
    Merge overlapping windows into one snippet, then return them all.

    :param text: The large body of text (e.g., proxy filing).
    :param phrases: A list of phrases to match exactly. (e.g. ["Executive Compensation"])
    :param pre_window: Number of words to include before each match.
    :param post_window: Number of words to include after each match.
    :return: A string containing merged snippets separated by a delimiter.
    """

    # 1) Split the entire text into words for indexing.
    words = text.split()
    total_words = len(words)
    if total_words == 0:
        return ""

    # 2) Build a prefix sum array of character offsets
    prefix_sum = [0]
    running_length = 0
    for w in words:
        running_length += len(w) + 1
        prefix_sum.append(running_length)

    # 3) Helper to find which word index corresponds to a given character offset
    def char_offset_to_word_index(offset):
        idx = bisect_right(prefix_sum, offset) - 1
        return max(min(idx, total_words - 1), 0)

    # 4) Collect all word-based windows around each match for each phrase
    segments = []
    for phrase in phrases:
        pattern = re.compile(re.escape(phrase), re.IGNORECASE)

        for match in pattern.finditer(text):
            start_char = match.start()
            match_word_index = char_offset_to_word_index(start_char)

            start_index = max(match_word_index - pre_window, 0)
            end_index = min(match_word_index + post_window + 1, total_words)

            segments.append((start_index, end_index))

    # 5) Merge overlapping segments
    segments.sort(key=lambda seg: seg[0])
    merged_segments: List[tuple] = []
    for seg in segments:
        if not merged_segments:
            merged_segments.append(seg)
        else:
            last_seg = merged_segments[-1]
            if seg[0] <= last_seg[1]:
                merged_segments[-1] = (last_seg[0], max(last_seg[1], seg[1]))
            else:
                merged_segments.append(seg)

    # 6) Reconstruct the text snippets from the merged segments
    snippets = []
    for start_i, end_i in merged_segments:
        snippet_words = words[start_i:end_i]
        snippet_text = " ".join(snippet_words)
        snippets.append(snippet_text.strip())

    # 7) Return the merged snippets separated by a delimiter
    return "\n\n--- SNIPPET BREAK ---\n\n".join(snippets)


def extract_regex_context(
    text: str,
    regex_pattern: str,
    pre_window: int = 500,
    post_window: int = 500,
    seen_contexts: Optional[set] = None,
    snippet_min_words: int = 15,
) -> List[str]:
    """
    For each regex match in `regex_pattern`, find all occurrences (case-insensitive)
    in `text` and grab `pre_window` words before and `post_window` words after.
    Merge overlapping windows into one snippet, then return them all.

    :param text: The large body of text (e.g., 10-K filing).
    :param regex_pattern: The regex pattern to match.
    :param pre_window: Number of words to include before each match.
    :param post_window: Number of words to include after each match.
    :param seen_contexts: Optional set of already seen contexts for deduplication.
    :param snippet_min_words: Minimum words required in a snippet to include it.
    :return: A list of context snippets, deduplicated if seen_contexts is provided.
    """

    words = text.split()
    total_words = len(words)
    if total_words == 0:
        return []

    prefix_sum = [0]
    running_length = 0
    for w in words:
        running_length += len(w) + 1
        prefix_sum.append(running_length)

    def char_offset_to_word_index(offset):
        idx = bisect_right(prefix_sum, offset) - 1
        return max(min(idx, total_words - 1), 0)

    pattern = re.compile(regex_pattern, re.IGNORECASE)
    segments = []

    for match in pattern.finditer(text):
        match_word_index = char_offset_to_word_index(match.start())

        start_index = max(match_word_index - pre_window, 0)
        end_index = min(match_word_index + post_window + 1, total_words)

        segments.append((start_index, end_index))

    if not segments:
        return []

    segments.sort()

    # Merge overlapping segments
    merged_segments = [segments[0]]
    for current in segments[1:]:
        prev_start, prev_end = merged_segments[-1]
        curr_start, curr_end = current

        if curr_start <= prev_end:
            merged_segments[-1] = (prev_start, max(prev_end, curr_end))
        else:
            merged_segments.append(current)

    # Join words to form the snippets and apply deduplication
    snippets = []
    for start, end in merged_segments:
        snippet = " ".join(words[start:end]).strip()

        # Apply deduplication if seen_contexts is provided
        if seen_contexts is not None:
            if snippet in seen_contexts:
                continue
            seen_contexts.add(snippet)

        # Skip very short extractions (likely fragments)
        if len(snippet.split()) < snippet_min_words:
            continue

        snippets.append(snippet)

    return snippets


def extract_ai_content(text: str) -> Optional[str]:
    """Extract AI-related content with context."""
    ai_keywords = [
        r"artificial intelligence",
        r"machine learning",
        r"\bai\b",
        r"neural network",
        r"deep learning",
        r"generative ai",
        r"\bllm\b",
        r"large language model",
        r"computer vision",
        r"natural language processing",
        r"\bnlp\b",
    ]
    pattern = "|".join(ai_keywords)
    matches = extract_matches_with_context(text, pattern)
    return format_matches_as_section(matches, "ai_specific_content")


def extract_rd_content(text: str) -> Optional[str]:
    """Extract R&D-related content with context."""
    pattern = (
        r"(?i)(?:Research\s+(?:&|and)\s+Development|R&D)\s*"
        r"(?:costs|expenses|activities|initiatives|efforts|investments|spending|"
        r"expenditures|programs|projects|operations|facilities|capabilities|strategy)?"
    )
    matches = extract_matches_with_context(text, pattern)
    return format_matches_as_section(matches, "rd_specific_content")

