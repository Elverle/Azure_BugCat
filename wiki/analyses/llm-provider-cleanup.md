---
title: 'Analysis: LLM provider cleanup and shared runtime helpers'
type: analysis
created: 2026-05-03
updated: 2026-05-03
sources:
  [
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-09-structured-output]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]',
    '[[wiki/sources/ft-11-openrouter-provider]]'
  ]
tags: [analysis, llm, providers, clean-code, testing]
lang: en
---

## Problem

The LLM layer had a stable public abstraction, but several runtime concerns had drifted across concrete providers and orchestration flows:

- provider adapters duplicated API-key validation, timeout setup, AppError helpers, schema-name mapping, and test-connection prompts,
- `similarity-service` treated blocking provider failures as recoverable category-local warnings,
- categorization and similarity used different JSON parsing tolerance,
- direct adapter coverage existed for OpenRouter and Generic only, leaving OpenAI, Anthropic, and Gemini with weaker regression protection.

## Root Cause

The original abstraction separated providers correctly at the transport boundary, but common runtime behavior stayed copied inside concrete classes and nearby services instead of being extracted into shared modules. That made the architecture look clean at the interface level while still allowing subtle policy drift in timeout handling, blocking-failure semantics, and response parsing.

## Solution

The cleanup introduced three shared modules and aligned the affected services:

- [[wiki/entities/provider-shared-utilities]] centralizes provider-level helpers without introducing a base class.
- [[wiki/entities/llm-error-policy]] defines which failures must abort a run.
- [[wiki/entities/llm-json-utilities]] provides one tolerant JSON parser for both categorization and similarity flows.

Behavioral changes from the refactor:

- all current providers now honor `LLMProviderConfig.timeout` consistently,
- [[wiki/entities/similarity-service]] now fail-fast on auth, timeout, and structured-output routing mismatch errors,
- [[wiki/entities/response-validator]] and similarity parsing now accept prose-wrapped JSON through the same helper,
- OpenAI, Anthropic, and Gemini now have direct adapter specs alongside the pre-existing OpenRouter and Generic coverage.

## Verification

The reviewed LLM slice was validated with targeted Vitest runs covering providers, factory, categorization, similarity, and response parsing.

Final focused suite result:

- 9 test files passed
- 81 tests passed

The executed coverage set included:

- provider specs for OpenAI, Anthropic, Gemini, OpenRouter, and Generic
- factory checks for all supported provider types
- categorization orchestration tests
- similar-bugs orchestration tests
- response-validator tests

## Components Involved

- [[wiki/entities/openai-provider]]
- [[wiki/entities/anthropic-provider]]
- [[wiki/entities/gemini-provider]]
- [[wiki/entities/generic-provider]]
- [[wiki/entities/openrouter-provider]]
- [[wiki/entities/provider-shared-utilities]]
- [[wiki/entities/llm-error-policy]]
- [[wiki/entities/llm-json-utilities]]
- [[wiki/entities/llm-service]]
- [[wiki/entities/similarity-service]]
- [[wiki/entities/response-validator]]

## See also

- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/analyses/structured-output-routing-mismatch]]
